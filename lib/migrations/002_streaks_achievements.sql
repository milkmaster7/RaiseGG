ALTER TABLE players
  ADD COLUMN IF NOT EXISTS current_streak   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_played_date DATE;

CREATE TABLE IF NOT EXISTS player_achievements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  achievement  TEXT NOT NULL,
  game         TEXT,
  earned_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, achievement)
);
CREATE INDEX IF NOT EXISTS idx_achievements_player ON player_achievements(player_id);
