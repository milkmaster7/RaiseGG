-- Missions & RaisePoints system
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

-- ─── RAISE POINTS COLUMN ─────────────────────────────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS raise_points INTEGER DEFAULT 0;

-- ─── PLAYER MISSIONS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS player_missions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  mission_id    TEXT NOT NULL,                -- matches template id e.g. 'daily_win_2'
  period        TEXT NOT NULL CHECK (period IN ('daily', 'weekly')),
  period_start  DATE NOT NULL,               -- today's date (daily) or Monday's date (weekly)
  progress      INTEGER NOT NULL DEFAULT 0,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  claimed       BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, mission_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_player_missions_player ON player_missions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_missions_period ON player_missions(period_start, period);
CREATE INDEX IF NOT EXISTS idx_player_missions_claimed ON player_missions(player_id, claimed);

-- ─── RAISE POINTS INDEX ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_players_raise_points ON players(raise_points DESC);

-- ─── RPC: Atomically add RaisePoints ─────────────────────────
CREATE OR REPLACE FUNCTION add_raise_points(
  p_player_id UUID,
  p_amount    INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE players
     SET raise_points = COALESCE(raise_points, 0) + p_amount
   WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE player_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_missions_select_own" ON player_missions
  FOR SELECT USING (auth.uid()::text = player_id::text);

CREATE POLICY "player_missions_insert_service" ON player_missions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "player_missions_update_service" ON player_missions
  FOR UPDATE USING (TRUE);
