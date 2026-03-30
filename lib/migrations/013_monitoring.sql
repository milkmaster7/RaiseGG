-- 013_monitoring.sql — Tables for self-healing monitor system

-- Cron run records — upserted by every cron handler
CREATE TABLE IF NOT EXISTS cron_runs (
  name       TEXT PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error')),
  message    TEXT,
  duration_ms INTEGER,
  ran_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert cooldowns — prevents spam (4h cooldown per check)
CREATE TABLE IF NOT EXISTS monitor_cooldowns (
  check_name TEXT PRIMARY KEY,
  alerted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cron_runs_ran_at ON cron_runs(ran_at);
