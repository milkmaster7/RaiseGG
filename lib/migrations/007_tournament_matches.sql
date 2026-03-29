-- ─────────────────────────────────────────────────────────────
-- 007: Tournament Matches (bracket system)
-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/_/sql
-- ─────────────────────────────────────────────────────────────

-- Update tournaments table: add 'registration' and 'in_progress' to status check
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_status_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_status_check
  CHECK (status IN ('upcoming', 'registration', 'live', 'in_progress', 'completed', 'cancelled'));

-- Update tournaments format: add 'single_elimination'
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check
  CHECK (format IN ('1v1', '5v5', 'single_elimination'));

-- Tournament bracket matches
CREATE TABLE IF NOT EXISTS tournament_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round           INTEGER NOT NULL,          -- 0 = first round
  position        INTEGER NOT NULL,          -- position within the round
  player_a_id     UUID REFERENCES players(id),
  player_b_id     UUID REFERENCES players(id),
  score_a         INTEGER,
  score_b         INTEGER,
  winner_id       UUID REFERENCES players(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, round, position)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_players ON tournament_matches(player_a_id, player_b_id);

-- Enable realtime for bracket updates
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_matches;

-- Update transactions type check to include tournament prize
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdraw', 'win', 'loss', 'rake', 'refund', 'tournament_prize'));
