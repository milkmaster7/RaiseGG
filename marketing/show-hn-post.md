# Show HN Post — RaiseGG

## Title
Show HN: RaiseGG – Play CS2/Dota 2 1v1 for USDC with Solana escrow

## URL
https://raisegg.com

## Text (if using text post instead of URL)
I built a platform where gamers stake USDC on their own CS2, Dota 2, and Deadlock matches. Both players deposit into a Solana escrow program before the match starts. Winner gets paid automatically in ~400ms.

Why:
- Wager gaming has always had a trust problem (loser doesn't pay)
- Cross-border payments between Turkey, Romania, Georgia, etc. are slow and expensive
- USDC on Solana solves both problems: trustless escrow + instant global payments

Tech:
- Next.js + Supabase (PostgreSQL)
- Solana SPL Token escrow program
- Dedicated game servers with VAC + MatchZy anti-cheat
- ELO matchmaking system
- City-based leaderboards

Target market is Eastern Europe, Turkey, Balkans, CIS, Central Asia — regions with huge gaming populations but almost no esports infrastructure.

Free daily tournaments (no deposit, $5 USDC prize) to let people try it without risk.

Interesting technical challenge: verifying match results on-chain. We use a trusted oracle approach — the game server submits results via webhook, which triggers the escrow release. Not fully decentralized, but the escrow itself is trustless (funds can't move without a valid result submission).

Would love feedback on the architecture and the concept.

## Ideal Posting Time
Tuesday-Thursday, 8-10 AM ET (13:00-15:00 UTC)

## Key Angles for HN Audience
- Technical: Solana escrow architecture, oracle problem for match results
- Business: Cross-border payments in underserved regions
- Gaming: Competitive 1v1 as a format
- Crypto: Real use case beyond speculation
