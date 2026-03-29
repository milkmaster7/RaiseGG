-- ═══════════════════════════════════════════════════════════════
-- Migration 007: Achievements system, seasonal cosmetics, linked accounts
-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. SEASONAL COSMETICS ────────────────────────────────────
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS seasonal BOOLEAN DEFAULT FALSE;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Season 1 cosmetics (expire end of Season 1: May 1 2026)
INSERT INTO cosmetics (id, category, name, price, preview_css, seasonal, expires_at) VALUES
  ('s1_champion_crown', 'border',        'Champion''s Crown',   3.00,  'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/40', TRUE, '2026-05-01T00:00:00Z'),
  ('s1_rising_star',    'badge',         'Rising Star',         2.00,  'bg-gradient-to-r from-yellow-400 to-orange-500',        TRUE, '2026-05-01T00:00:00Z'),
  ('s1_veteran',        'badge',         'Season 1 Veteran',    0.00,  'bg-emerald-600',                                        TRUE, '2026-05-01T00:00:00Z'),
  ('s1_golden_pnl',     'card_border',   'Golden PnL',          4.00,  'border-2 border-yellow-400 shadow-lg shadow-yellow-400/30', TRUE, '2026-05-01T00:00:00Z'),
  ('s1_phoenix_ring',   'avatar_effect', 'Phoenix Ring',        3.50,  'animate-pulse ring-2 ring-orange-400 shadow-lg shadow-orange-400/40', TRUE, '2026-05-01T00:00:00Z'),
  ('s1_emerald_glow',   'border',        'Emerald Glow',        2.50,  'ring-2 ring-emerald-400 shadow-lg shadow-emerald-400/30', TRUE, '2026-05-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. LINKED ACCOUNTS COLUMNS ON PLAYERS ────────────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS faceit_username TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS faceit_level INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS faceit_elo INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS leetify_url TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS leetify_rating INTEGER;

-- ─── 3. ENSURE player_achievements TABLE EXISTS ───────────────
-- (Created in migration 002 but ensuring it's here for completeness)
CREATE TABLE IF NOT EXISTS player_achievements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  achievement  TEXT NOT NULL,
  game         TEXT,
  earned_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, achievement)
);
CREATE INDEX IF NOT EXISTS idx_achievements_player ON player_achievements(player_id);

-- ─── 4. FRIENDS TABLE (if not exists, needed for achievement counting) ──
CREATE TABLE IF NOT EXISTS friends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friends_player ON friends(player_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);

-- ─── 5. INDEXES FOR LINKED ACCOUNTS ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_players_faceit ON players(faceit_username);
