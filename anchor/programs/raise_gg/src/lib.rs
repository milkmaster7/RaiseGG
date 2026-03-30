use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Mint;

declare_id!("5TVDLAMTv5hGkgAmEYZsfdyPEvuUBJtkAnqy1LkyQPLK");

pub const PLATFORM_FEE_BPS: u64 = 1000; // 10%
pub const BPS_DENOMINATOR:   u64 = 10_000;

/// Platform treasury wallet — rake is sent here on every resolved match.
pub const TREASURY: &str = "2EYPY7nozd8ZnsKBhG7imZKkm36rthzw3ELRWCGvmfLG";

// ─── Program ─────────────────────────────────────────────────────────────────

#[program]
pub mod raise_gg {
    use super::*;

    /// Step 1 — Player A creates the match and deposits their stake.
    /// The vault token account is created as a PDA owned by match_state.
    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_id: [u8; 16],
        stake_amount: u64,
        authority: Pubkey,
    ) -> Result<()> {
        require!(stake_amount > 0, RaiseError::ZeroStake);

        let state        = &mut ctx.accounts.match_state;
        state.match_id   = match_id;
        state.player_a   = ctx.accounts.player_a.key();
        state.player_b   = Pubkey::default();
        state.authority  = authority;
        state.usdc_mint  = ctx.accounts.usdc_mint.key();
        state.stake      = stake_amount;
        state.status     = MatchStatus::Open;
        state.bump       = ctx.bumps.match_state;
        state.vault_bump = ctx.bumps.vault;

        // Transfer player A's stake → vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.player_a_ata.to_account_info(),
                    to:        ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.player_a.to_account_info(),
                },
            ),
            stake_amount,
        )?;

        emit!(MatchCreated {
            match_id,
            player_a: ctx.accounts.player_a.key(),
            stake_amount,
        });
        Ok(())
    }

    /// Step 2 — Player B joins and deposits equal stake.
    pub fn join_match(
        ctx: Context<JoinMatch>,
        match_id: [u8; 16],
    ) -> Result<()> {
        let state = &mut ctx.accounts.match_state;
        require!(state.status == MatchStatus::Open,         RaiseError::MatchNotOpen);
        require!(state.player_b == Pubkey::default(),       RaiseError::AlreadyJoined);
        require!(ctx.accounts.player_b.key() != state.player_a, RaiseError::SamePlayer);

        state.player_b = ctx.accounts.player_b.key();
        state.status   = MatchStatus::Locked;
        let stake      = state.stake;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.player_b_ata.to_account_info(),
                    to:        ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.player_b.to_account_info(),
                },
            ),
            stake,
        )?;

        emit!(MatchJoined {
            match_id,
            player_b: ctx.accounts.player_b.key(),
        });
        Ok(())
    }

    /// Step 3 — Authority (backend) resolves the match.
    /// Pays winner 90%, treasury 10%, closes vault + match_state.
    pub fn resolve_match(
        ctx: Context<ResolveMatch>,
        match_id: [u8; 16],
        winner: Pubkey,
    ) -> Result<()> {
        let state = &ctx.accounts.match_state;
        require!(state.status == MatchStatus::Locked, RaiseError::MatchNotLocked);
        require!(
            winner == state.player_a || winner == state.player_b,
            RaiseError::InvalidWinner,
        );
        // Verify winner_ata is owned by winner
        require!(
            ctx.accounts.winner_ata.owner == winner,
            RaiseError::WrongWinnerAta,
        );
        // Verify winner_ata mint matches the staked mint
        require!(
            ctx.accounts.winner_ata.mint == state.usdc_mint,
            RaiseError::WrongMint,
        );

        let total_pot = state.stake.checked_mul(2).ok_or(RaiseError::Overflow)?;
        let rake      = total_pot.checked_mul(PLATFORM_FEE_BPS).ok_or(RaiseError::Overflow)?
                            .checked_div(BPS_DENOMINATOR).ok_or(RaiseError::Overflow)?;
        let payout    = total_pot.checked_sub(rake).ok_or(RaiseError::Overflow)?;

        // match_state is the vault authority — sign with its seeds
        let mid   = state.match_id;
        let bump  = state.bump;
        let seeds = &[b"match" as &[u8], mid.as_ref(), &[bump]];
        let signer = &[&seeds[..]];

        // Pay winner
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.vault.to_account_info(),
                    to:        ctx.accounts.winner_ata.to_account_info(),
                    authority: ctx.accounts.match_state.to_account_info(),
                },
                signer,
            ),
            payout,
        )?;

        // Pay rake to treasury
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.vault.to_account_info(),
                    to:        ctx.accounts.treasury_ata.to_account_info(),
                    authority: ctx.accounts.match_state.to_account_info(),
                },
                signer,
            ),
            rake,
        )?;

        // Close empty vault — rent back to authority
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                CloseAccount {
                    account:     ctx.accounts.vault.to_account_info(),
                    destination: ctx.accounts.authority.to_account_info(),
                    authority:   ctx.accounts.match_state.to_account_info(),
                },
                signer,
            ),
        )?;

        emit!(MatchResolved { match_id, winner, payout, rake });
        Ok(())
        // match_state closed via `close = authority` in ResolveMatch accounts
    }

    /// Cancel — Open: refund player A only.  Locked: refund both players.
    /// Only callable by authority (backend cron handles expiry logic).
    pub fn cancel_match(
        ctx: Context<CancelMatch>,
        match_id: [u8; 16],
    ) -> Result<()> {
        let state  = &ctx.accounts.match_state;
        let status = state.status.clone();
        require!(
            status == MatchStatus::Open || status == MatchStatus::Locked,
            RaiseError::NotCancellable,
        );

        let mid   = state.match_id;
        let bump  = state.bump;
        let stake = state.stake;
        let seeds = &[b"match" as &[u8], mid.as_ref(), &[bump]];
        let signer = &[&seeds[..]];

        // Always refund player A
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.vault.to_account_info(),
                    to:        ctx.accounts.player_a_ata.to_account_info(),
                    authority: ctx.accounts.match_state.to_account_info(),
                },
                signer,
            ),
            stake,
        )?;

        // If locked, also refund player B
        if status == MatchStatus::Locked {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    Transfer {
                        from:      ctx.accounts.vault.to_account_info(),
                        to:        ctx.accounts.player_b_ata.to_account_info(),
                        authority: ctx.accounts.match_state.to_account_info(),
                    },
                    signer,
                ),
                stake,
            )?;
        }

        // Close empty vault — rent back to authority
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                CloseAccount {
                    account:     ctx.accounts.vault.to_account_info(),
                    destination: ctx.accounts.authority.to_account_info(),
                    authority:   ctx.accounts.match_state.to_account_info(),
                },
                signer,
            ),
        )?;

        emit!(MatchCancelled { match_id });
        Ok(())
    }
}

// ─── Account contexts ────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(match_id: [u8; 16])]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub player_a: Signer<'info>,

    /// Player A's USDC token account
    #[account(
        mut,
        constraint = player_a_ata.owner == player_a.key(),
        constraint = player_a_ata.mint  == usdc_mint.key(),
    )]
    pub player_a_ata: Account<'info, TokenAccount>,

    /// Match state PDA — authority over the vault
    #[account(
        init,
        payer  = player_a,
        space  = MatchState::SIZE,
        seeds  = [b"match", match_id.as_ref()],
        bump,
    )]
    pub match_state: Account<'info, MatchState>,

    /// Vault token account — PDA-owned, holds both stakes
    #[account(
        init,
        payer  = player_a,
        token::mint      = usdc_mint,
        token::authority = match_state,
        seeds  = [b"vault", match_id.as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub usdc_mint:              Account<'info, Mint>,
    pub token_program:          Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program:         Program<'info, System>,
    pub rent:                   Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(match_id: [u8; 16])]
pub struct JoinMatch<'info> {
    #[account(mut)]
    pub player_b: Signer<'info>,

    #[account(
        mut,
        constraint = player_b_ata.owner == player_b.key(),
        constraint = player_b_ata.mint  == match_state.usdc_mint(),
    )]
    pub player_b_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"match", match_id.as_ref()],
        bump  = match_state.bump,
    )]
    pub match_state: Account<'info, MatchState>,

    #[account(
        mut,
        seeds = [b"vault", match_id.as_ref()],
        bump  = match_state.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(match_id: [u8; 16])]
pub struct ResolveMatch<'info> {
    /// Backend authority signer — receives rent from closed accounts
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Winner's USDC token account
    #[account(mut)]
    pub winner_ata: Account<'info, TokenAccount>,

    /// Platform treasury USDC token account — must be owned by hardcoded treasury wallet
    #[account(
        mut,
        constraint = treasury_ata.owner == TREASURY.parse::<Pubkey>().unwrap() @ RaiseError::WrongTreasury,
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds  = [b"match", match_id.as_ref()],
        bump   = match_state.bump,
        constraint = *authority.key == match_state.authority @ RaiseError::NotAuthority,
        close  = authority,
    )]
    pub match_state: Account<'info, MatchState>,

    #[account(
        mut,
        seeds = [b"vault", match_id.as_ref()],
        bump  = match_state.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(match_id: [u8; 16])]
pub struct CancelMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Player A refund destination
    #[account(
        mut,
        constraint = player_a_ata.owner == match_state.player_a,
    )]
    pub player_a_ata: Account<'info, TokenAccount>,

    /// Player B refund destination (pass player_a_ata again for Open matches — unused)
    #[account(
        mut,
        constraint = player_b_ata.owner == match_state.player_b
            || match_state.status == MatchStatus::Open,
    )]
    pub player_b_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds  = [b"match", match_id.as_ref()],
        bump   = match_state.bump,
        constraint = *authority.key == match_state.authority @ RaiseError::NotAuthority,
        close  = authority,
    )]
    pub match_state: Account<'info, MatchState>,

    #[account(
        mut,
        seeds = [b"vault", match_id.as_ref()],
        bump  = match_state.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ─── State ───────────────────────────────────────────────────────────────────

#[account]
#[derive(Default)]
pub struct MatchState {
    pub match_id:   [u8; 16],   // UUID
    pub player_a:   Pubkey,
    pub player_b:   Pubkey,     // Pubkey::default() when Open
    pub authority:  Pubkey,     // Backend signer allowed to resolve/cancel
    pub usdc_mint:  Pubkey,     // USDC mint stored at creation — used in JoinMatch constraint
    pub stake:      u64,        // Per-player stake in USDC lamports (6 decimals)
    pub status:     MatchStatus,
    pub bump:       u8,
    pub vault_bump: u8,
}

impl MatchState {
    // 8 discriminator + 16 match_id + 32 player_a + 32 player_b + 32 authority
    // + 32 usdc_mint + 8 stake + 1 status + 1 bump + 1 vault_bump + 8 padding
    pub const SIZE: usize = 8 + 16 + 32 + 32 + 32 + 32 + 8 + 1 + 1 + 1 + 8;

    pub fn usdc_mint(&self) -> Pubkey {
        self.usdc_mint
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Default)]
pub enum MatchStatus {
    #[default]
    Open,
    Locked,
    Resolved,
    Cancelled,
}

// ─── Events ──────────────────────────────────────────────────────────────────

#[event]
pub struct MatchCreated {
    pub match_id:     [u8; 16],
    pub player_a:     Pubkey,
    pub stake_amount: u64,
}

#[event]
pub struct MatchJoined {
    pub match_id: [u8; 16],
    pub player_b: Pubkey,
}

#[event]
pub struct MatchResolved {
    pub match_id: [u8; 16],
    pub winner:   Pubkey,
    pub payout:   u64,
    pub rake:     u64,
}

#[event]
pub struct MatchCancelled {
    pub match_id: [u8; 16],
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum RaiseError {
    #[msg("Stake amount must be greater than zero")]
    ZeroStake,
    #[msg("Match is not open")]
    MatchNotOpen,
    #[msg("Match is not locked")]
    MatchNotLocked,
    #[msg("Match already has a second player")]
    AlreadyJoined,
    #[msg("Cannot join your own match")]
    SamePlayer,
    #[msg("Winner must be one of the two players")]
    InvalidWinner,
    #[msg("winner_ata does not belong to the declared winner")]
    WrongWinnerAta,
    #[msg("Match cannot be cancelled in its current state")]
    NotCancellable,
    #[msg("Caller is not the authority")]
    NotAuthority,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("treasury_ata does not belong to the platform treasury")]
    WrongTreasury,
    #[msg("winner_ata mint does not match the staked token")]
    WrongMint,
}
