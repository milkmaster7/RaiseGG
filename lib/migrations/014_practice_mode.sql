-- Add practice mode flag and rank-gated fields to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_practice BOOLEAN DEFAULT FALSE;

-- Index for practice lobby queries
CREATE INDEX IF NOT EXISTS idx_matches_practice ON matches(is_practice) WHERE is_practice = true AND status = 'open';
