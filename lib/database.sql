-- ─────────────────────────────────────────────────────────────
-- RaiseGG.gg — Supabase Database Schema
-- Run this in the Supabase SQL editor
-- ─────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PLAYERS ──────────────────────────────────────────────────
CREATE TABLE players (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  steam_id          TEXT UNIQUE NOT NULL,
  username          TEXT NOT NULL,
  avatar_url        TEXT,
  country           TEXT,
  email             TEXT,
  wallet_address    TEXT,
  usdc_balance      NUMERIC(18, 6) DEFAULT 0,

  -- ELO per game
  cs2_elo           INTEGER DEFAULT 1000,
  dota2_elo         INTEGER DEFAULT 1000,
  deadlock_elo      INTEGER DEFAULT 1000,

  -- Match counts
  cs2_wins          INTEGER DEFAULT 0,
  cs2_losses        INTEGER DEFAULT 0,
  dota2_wins        INTEGER DEFAULT 0,
  dota2_losses      INTEGER DEFAULT 0,
  deadlock_wins     INTEGER DEFAULT 0,
  deadlock_losses   INTEGER DEFAULT 0,

  -- Eligibility (checked at login)
  vac_banned        BOOLEAN DEFAULT FALSE,
  account_age_ok    BOOLEAN DEFAULT FALSE,
  hours_ok          BOOLEAN DEFAULT FALSE,
  eligible          BOOLEAN DEFAULT FALSE,

  -- Admin
  banned            BOOLEAN DEFAULT FALSE,
  ban_reason        TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MATCHES ──────────────────────────────────────────────────
CREATE TABLE matches (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game                TEXT NOT NULL CHECK (game IN ('cs2', 'dota2', 'deadlock')),
  format              TEXT NOT NULL CHECK (format IN ('1v1', '5v5')),
  player_a_id         UUID NOT NULL REFERENCES players(id),
  player_b_id         UUID REFERENCES players(id),

  stake_amount        NUMERIC(18, 6) NOT NULL,
  vault_pda           TEXT,                        -- Solana PDA address
  create_tx           TEXT,                        -- Solana tx signature (create)
  join_tx             TEXT,                        -- Solana tx signature (join)
  resolve_tx          TEXT,                        -- Solana tx signature (resolve)

  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','locked','live','completed','cancelled','disputed')),

  winner_id           UUID REFERENCES players(id),
  match_id_external   TEXT,                        -- Dota2 match ID or CS2 match ID
  used_match_ids      TEXT[] DEFAULT '{}',         -- prevent reuse

  -- CS2 server assignment
  server_ip           TEXT,
  server_port         INTEGER,
  connect_token       TEXT,

  -- Timeout handling
  expires_at          TIMESTAMPTZ,                 -- auto-cancel if not joined by this time
  resolve_deadline    TIMESTAMPTZ,                 -- auto-cancel if not resolved by this time

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ
);

-- ─── TRANSACTIONS ─────────────────────────────────────────────
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id       UUID NOT NULL REFERENCES players(id),
  type            TEXT NOT NULL CHECK (type IN ('deposit','withdraw','win','loss','rake','refund')),
  amount          NUMERIC(18, 6) NOT NULL,
  tx_signature    TEXT,
  match_id        UUID REFERENCES matches(id),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DISPUTES ─────────────────────────────────────────────────
CREATE TABLE disputes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id      UUID NOT NULL REFERENCES matches(id),
  raised_by_id  UUID NOT NULL REFERENCES players(id),
  reason        TEXT NOT NULL,
  evidence      TEXT,                             -- screenshot URL etc
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','resolved','cancelled')),
  resolution    TEXT,
  resolved_by   TEXT,                             -- admin note
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- ─── TOURNAMENTS ──────────────────────────────────────────────
CREATE TABLE tournaments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  game                TEXT NOT NULL CHECK (game IN ('cs2', 'dota2', 'deadlock')),
  format              TEXT NOT NULL CHECK (format IN ('1v1', '5v5')),
  prize_pool          NUMERIC(18, 6) DEFAULT 0,
  entry_fee           NUMERIC(18, 6) DEFAULT 0,
  max_players         INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'upcoming'
                        CHECK (status IN ('upcoming','live','completed','cancelled')),
  starts_at           TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_registrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id),
  player_id       UUID NOT NULL REFERENCES players(id),
  paid            BOOLEAN DEFAULT FALSE,
  tx_signature    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- ─── BANS ─────────────────────────────────────────────────────
CREATE TABLE bans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   UUID NOT NULL REFERENCES players(id),
  reason      TEXT NOT NULL,
  banned_by   TEXT DEFAULT 'admin',
  expires_at  TIMESTAMPTZ,                        -- NULL = permanent
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_matches_player_a ON matches(player_a_id);
CREATE INDEX idx_matches_player_b ON matches(player_b_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_game ON matches(game);
CREATE INDEX idx_transactions_player ON transactions(player_id);
CREATE INDEX idx_players_steam ON players(steam_id);
CREATE INDEX idx_players_cs2_elo ON players(cs2_elo DESC);
CREATE INDEX idx_players_dota2_elo ON players(dota2_elo DESC);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Players: can only read/update their own row
CREATE POLICY "players_select_own" ON players FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "players_update_own" ON players FOR UPDATE USING (auth.uid()::text = id::text);

-- Matches: public read (for lobby browser), insert own
CREATE POLICY "matches_select_all" ON matches FOR SELECT USING (TRUE);
CREATE POLICY "matches_insert_own" ON matches FOR INSERT WITH CHECK (
  auth.uid()::text = player_a_id::text
);

-- Transactions: own only
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (
  auth.uid()::text = player_id::text
);

-- ─── AUTO-UPDATE updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── WALLET: Atomic deposit credit ───────────────────────────
-- Increments usdc_balance and inserts a transaction record atomically.
-- Called from /api/wallet/deposit after on-chain verification.
CREATE OR REPLACE FUNCTION credit_deposit(
  p_player_id    UUID,
  p_amount       NUMERIC,
  p_tx_signature TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE players
     SET usdc_balance = usdc_balance + p_amount
   WHERE id = p_player_id;

  INSERT INTO transactions (player_id, type, amount, tx_signature, note)
  VALUES (p_player_id, 'deposit', p_amount, p_tx_signature, 'USDC deposit');
END;
$$ LANGUAGE plpgsql;

-- ─── CRON: Auto-cancel expired matches ────────────────────────
-- Run in Supabase Dashboard > Database > Extensions > pg_cron
-- SELECT cron.schedule('cancel-expired-matches', '*/5 * * * *', $$
--   UPDATE matches SET status = 'cancelled'
--   WHERE status = 'open' AND expires_at < NOW();
--
--   UPDATE matches SET status = 'cancelled'
--   WHERE status IN ('open','locked') AND resolve_deadline < NOW();
-- $$);
