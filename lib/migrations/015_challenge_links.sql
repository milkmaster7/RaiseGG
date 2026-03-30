-- Challenge link sharing system
CREATE TABLE IF NOT EXISTS challenge_links (
  id TEXT PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES players(id),
  game TEXT NOT NULL,
  stake_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usdc',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by UUID REFERENCES players(id),
  match_id UUID REFERENCES matches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_links_creator ON challenge_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenge_links_status ON challenge_links(status) WHERE status = 'active';
