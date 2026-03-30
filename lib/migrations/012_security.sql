-- 012_security.sql — VAC ban tracking columns

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT NULL;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS last_vac_check TIMESTAMPTZ DEFAULT NULL;

-- Index for the cron job query (unbanned players needing a check)
CREATE INDEX IF NOT EXISTS idx_players_vac_check
  ON players (banned, last_vac_check)
  WHERE banned = false;
