-- Daily login streak & reward system
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS login_streak      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_daily_claim  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_date   TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS daily_rewards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reward_type   TEXT NOT NULL CHECK (reward_type IN ('elo_boost', 'usdc_bonus', 'rake_discount')),
  reward_value  NUMERIC(10, 2) NOT NULL,
  streak_day    INTEGER NOT NULL DEFAULT 1,
  milestone     TEXT,
  claimed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_player ON daily_rewards(player_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_claimed ON daily_rewards(claimed_at DESC);
