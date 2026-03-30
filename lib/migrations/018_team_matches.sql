-- Team match columns
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_team_match BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_size INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stake_per_player NUMERIC;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a_ids UUID[] DEFAULT '{}';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b_ids UUID[] DEFAULT '{}';

-- Index for team match queries
CREATE INDEX IF NOT EXISTS idx_matches_team ON matches(is_team_match) WHERE is_team_match = true AND status = 'open';
