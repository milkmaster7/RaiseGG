-- ─────────────────────────────────────────────────────────────
-- Migration 004: Affiliate system, cosmetics shop, premium subscription
-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- ─────────────────────────────────────────────────────────────

-- ─── ADD referred_by TO PLAYERS (if not exists) ─────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES players(id);

-- ─── ADD premium_until TO PLAYERS ───────────────────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- ─── ADD cosmetic equip columns TO PLAYERS ──────────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_border TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_badge TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_card_border TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_avatar_effect TEXT;

-- ─── EXPAND TRANSACTION TYPES ────────────────────────────────
-- Drop the old check and add new one including referral_bonus, cosmetic_purchase, premium_sub
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit','withdraw','win','loss','rake','refund','referral_bonus','cosmetic_purchase','premium_sub'));

-- ─── COSMETICS CATALOG ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cosmetics (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN ('border','badge','card_border','avatar_effect')),
  name        TEXT NOT NULL,
  price       NUMERIC(18, 6) NOT NULL DEFAULT 0,
  preview_css TEXT,  -- CSS classes or data for rendering preview
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PLAYER COSMETICS (OWNED ITEMS) ─────────────────────────
CREATE TABLE IF NOT EXISTS player_cosmetics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   UUID NOT NULL REFERENCES players(id),
  cosmetic_id TEXT NOT NULL REFERENCES cosmetics(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, cosmetic_id)
);

-- ─── CREATOR APPLICATIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id       UUID NOT NULL REFERENCES players(id),
  platform        TEXT NOT NULL,
  handle          TEXT NOT NULL,
  follower_count  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_players_referred_by ON players(referred_by);
CREATE INDEX IF NOT EXISTS idx_player_cosmetics_player ON player_cosmetics(player_id);
CREATE INDEX IF NOT EXISTS idx_creator_applications_player ON creator_applications(player_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- ─── SEED COSMETICS CATALOG ─────────────────────────────────
INSERT INTO cosmetics (id, category, name, price, preview_css) VALUES
  -- Profile Borders
  ('border_flame',    'border',        'Flame',           1.00,  'ring-2 ring-orange-500'),
  ('border_frost',    'border',        'Frost',           1.00,  'ring-2 ring-cyan-400'),
  ('border_electric', 'border',        'Electric',        1.50,  'ring-2 ring-yellow-300'),
  ('border_gold',     'border',        'Gold',            2.00,  'ring-2 ring-amber-400'),
  ('border_diamond',  'border',        'Diamond',         3.00,  'ring-2 ring-white'),
  -- Badges
  ('badge_early',     'badge',         'Early Supporter', 0.00,  'bg-emerald-500'),
  ('badge_streak',    'badge',         'Streak Master',   1.00,  'bg-orange-500'),
  ('badge_winmachine','badge',         'Win Machine',     1.50,  'bg-purple-500'),
  -- Card Borders
  ('card_neon',       'card_border',   'Neon Green',      2.00,  'border-2 border-green-400'),
  ('card_blood',      'card_border',   'Blood Red',       2.00,  'border-2 border-red-500'),
  ('card_royal',      'card_border',   'Royal Purple',    2.50,  'border-2 border-purple-500'),
  -- Animated Avatars
  ('avatar_pulse',    'avatar_effect', 'Pulse Ring',      1.00,  'animate-pulse ring-2 ring-cyan-400'),
  ('avatar_fire',     'avatar_effect', 'Fire Ring',       2.00,  'animate-pulse ring-2 ring-orange-500'),
  ('avatar_lightning','avatar_effect', 'Lightning Ring',  3.00,  'animate-pulse ring-2 ring-yellow-300')
ON CONFLICT (id) DO NOTHING;
