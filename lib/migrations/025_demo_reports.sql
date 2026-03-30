-- Demo round reports: players can flag suspicious rounds for review
CREATE TABLE IF NOT EXISTS demo_reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_id     UUID NOT NULL REFERENCES match_demos(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round       INT NOT NULL CHECK (round >= 1),
  reason      TEXT NOT NULL CHECK (reason IN ('suspicious_play', 'possible_aimbot', 'wallhack_suspect', 'other')),
  details     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'confirmed', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate reports from same player on same round
  UNIQUE(demo_id, player_id, round)
);

CREATE INDEX IF NOT EXISTS idx_demo_reports_demo ON demo_reports(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_reports_status ON demo_reports(status);

-- RLS
ALTER TABLE demo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY demo_reports_insert ON demo_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY demo_reports_select ON demo_reports
  FOR SELECT USING (true);
