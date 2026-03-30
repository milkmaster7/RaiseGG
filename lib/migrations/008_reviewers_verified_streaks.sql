-- Reviewers
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_reviewer BOOLEAN DEFAULT FALSE;

-- Match reviews
CREATE TABLE IF NOT EXISTS match_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES players(id),
  verdict TEXT NOT NULL CHECK (verdict IN ('valid', 'invalid', 'inconclusive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_match_reviews_match ON match_reviews(match_id);
CREATE INDEX IF NOT EXISTS idx_match_reviews_reviewer ON match_reviews(reviewer_id);

-- Verified queue support
CREATE INDEX IF NOT EXISTS idx_players_verified ON players(faceit_username, leetify_url);

-- Streak milestones tracking
ALTER TABLE daily_rewards ADD COLUMN IF NOT EXISTS multiplier NUMERIC(4,2) DEFAULT 1.0;
ALTER TABLE daily_rewards ADD COLUMN IF NOT EXISTS cosmetic_drop TEXT;
