-- ═══════════════════════════════════════════════════════════════
-- RaiseGG — All new features migration
-- Run in Supabase SQL editor as ONE block:
-- https://supabase.com/dashboard/project/_/sql/new
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. PLAYER COLUMNS ─────────────────────────────────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS referred_by          UUID REFERENCES players(id);
ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_until        TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_border      TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_badge       TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_card_border TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_avatar_effect TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS login_streak         INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_daily_claim     TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_login_date      TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_code        TEXT;

-- ─── 2. MATCH COLUMNS (PnL card game detail) ───────────────────
ALTER TABLE matches ADD COLUMN IF NOT EXISTS game_detail       TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS game_detail_loser TEXT;

-- ─── 3. EXPAND TRANSACTION TYPES ────────────────────────────────
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'deposit', 'withdraw', 'win', 'loss', 'rake', 'refund',
    'referral_bonus', 'cosmetic_purchase', 'premium_sub',
    'battle_pass_purchase', 'battle_pass_reward', 'daily_reward'
  ));

-- ─── 4. COSMETICS CATALOG ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cosmetics (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN ('border','badge','card_border','avatar_effect')),
  name        TEXT NOT NULL,
  price       NUMERIC(18, 6) NOT NULL DEFAULT 0,
  preview_css TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. PLAYER COSMETICS (owned items) ─────────────────────────
CREATE TABLE IF NOT EXISTS player_cosmetics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id),
  cosmetic_id  TEXT NOT NULL REFERENCES cosmetics(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, cosmetic_id)
);

-- ─── 6. CREATOR APPLICATIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id),
  platform        TEXT NOT NULL,
  handle          TEXT NOT NULL,
  follower_count  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

-- ─── 7. DAILY REWARDS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reward_type   TEXT NOT NULL CHECK (reward_type IN ('elo_boost', 'usdc_bonus', 'rake_discount')),
  reward_value  NUMERIC(10, 2) NOT NULL,
  streak_day    INTEGER NOT NULL DEFAULT 1,
  milestone     TEXT,
  claimed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. BATTLE PASS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS battle_pass_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id),
  season      INTEGER NOT NULL DEFAULT 1,
  total_xp    INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, season)
);

CREATE TABLE IF NOT EXISTS battle_pass_purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id),
  season      INTEGER NOT NULL DEFAULT 1,
  price_usdc  NUMERIC(18, 6) NOT NULL DEFAULT 5.00,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, season)
);

CREATE TABLE IF NOT EXISTS battle_pass_claims (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id),
  season      INTEGER NOT NULL DEFAULT 1,
  tier_key    INTEGER NOT NULL,
  tier        INTEGER NOT NULL,
  track       TEXT NOT NULL CHECK (track IN ('free', 'premium')),
  reward_name TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, season, tier_key)
);

-- ─── 9. MATCHMAKING QUEUE (updated for auto-queue) ─────────────
-- This table may already exist — add missing columns
ALTER TABLE matchmaking_queue ADD COLUMN IF NOT EXISTS stake_amount NUMERIC(18, 6);
ALTER TABLE matchmaking_queue ADD COLUMN IF NOT EXISTS currency     TEXT DEFAULT 'usdc';
ALTER TABLE matchmaking_queue ADD COLUMN IF NOT EXISTS matched_with UUID;
ALTER TABLE matchmaking_queue ADD COLUMN IF NOT EXISTS match_id     UUID;

-- ─── 10. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_players_referred_by       ON players(referred_by);
CREATE INDEX IF NOT EXISTS idx_players_referral_code     ON players(referral_code);
CREATE INDEX IF NOT EXISTS idx_player_cosmetics_player   ON player_cosmetics(player_id);
CREATE INDEX IF NOT EXISTS idx_creator_apps_player       ON creator_applications(player_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type         ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_player      ON daily_rewards(player_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_claimed     ON daily_rewards(claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_progress_player        ON battle_pass_progress(player_id, season);
CREATE INDEX IF NOT EXISTS idx_bp_purchases_player       ON battle_pass_purchases(player_id, season);
CREATE INDEX IF NOT EXISTS idx_bp_claims_player          ON battle_pass_claims(player_id, season);
CREATE INDEX IF NOT EXISTS idx_matches_game_detail       ON matches(game_detail);

-- ─── 11. SEED COSMETICS CATALOG ─────────────────────────────────
INSERT INTO cosmetics (id, category, name, price, preview_css) VALUES
  ('border_flame',    'border',        'Flame',           1.00,  'ring-2 ring-orange-500'),
  ('border_frost',    'border',        'Frost',           1.00,  'ring-2 ring-cyan-400'),
  ('border_electric', 'border',        'Electric',        1.50,  'ring-2 ring-yellow-300'),
  ('border_gold',     'border',        'Gold',            2.00,  'ring-2 ring-amber-400'),
  ('border_diamond',  'border',        'Diamond',         3.00,  'ring-2 ring-white'),
  ('badge_early',     'badge',         'Early Supporter', 0.00,  'bg-emerald-500'),
  ('badge_streak',    'badge',         'Streak Master',   1.00,  'bg-orange-500'),
  ('badge_winmachine','badge',         'Win Machine',     1.50,  'bg-purple-500'),
  ('card_neon',       'card_border',   'Neon Green',      2.00,  'border-2 border-green-400'),
  ('card_blood',      'card_border',   'Blood Red',       2.00,  'border-2 border-red-500'),
  ('card_royal',      'card_border',   'Royal Purple',    2.50,  'border-2 border-purple-500'),
  ('avatar_pulse',    'avatar_effect', 'Pulse Ring',      1.00,  'animate-pulse ring-2 ring-cyan-400'),
  ('avatar_fire',     'avatar_effect', 'Fire Ring',       2.00,  'animate-pulse ring-2 ring-orange-500'),
  ('avatar_lightning','avatar_effect', 'Lightning Ring',  3.00,  'animate-pulse ring-2 ring-yellow-300')
ON CONFLICT (id) DO NOTHING;

-- ─── 12. INCREMENT BALANCE RPC (if not exists) ──────────────────
CREATE OR REPLACE FUNCTION increment_balance(
  player_id UUID,
  field TEXT,
  amount NUMERIC
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE players SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    field, field
  ) USING amount, player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
