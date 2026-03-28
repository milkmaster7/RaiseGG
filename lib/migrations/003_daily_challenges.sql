CREATE TABLE IF NOT EXISTS daily_challenges (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  slot           INTEGER NOT NULL CHECK (slot IN (1, 2, 3)),
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  game           TEXT,
  challenge_type TEXT NOT NULL, -- 'win_match', 'play_match', 'stake_amount', 'win_streak'
  target         INTEGER NOT NULL DEFAULT 1,
  xp_reward      TEXT NOT NULL DEFAULT '50 ELO bonus',
  UNIQUE(challenge_date, slot)
);

CREATE TABLE IF NOT EXISTS player_challenge_completions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, challenge_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_player ON player_challenge_completions(player_id, challenge_date);
-- Add challenge_date to completions for fast filtering:
ALTER TABLE player_challenge_completions ADD COLUMN IF NOT EXISTS challenge_date DATE DEFAULT CURRENT_DATE;
