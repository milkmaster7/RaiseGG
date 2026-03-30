CREATE TABLE IF NOT EXISTS side_wagers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  backing TEXT NOT NULL CHECK (backing IN ('player_a', 'player_b')),
  amount NUMERIC(18,6) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'refunded')),
  payout NUMERIC(18,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_side_wagers_match ON side_wagers(match_id);
CREATE INDEX IF NOT EXISTS idx_side_wagers_player ON side_wagers(player_id);
