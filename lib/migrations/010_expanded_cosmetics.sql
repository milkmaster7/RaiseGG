-- ─────────────────────────────────────────────────────────────
-- Migration 010: Expanded cosmetics catalog (36 new items) + newsletter
-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- ─────────────────────────────────────────────────────────────

-- Add seasonal columns to cosmetics table
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS seasonal BOOLEAN DEFAULT FALSE;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ─── NEW BORDERS (8) ────────────────────────────────────────
INSERT INTO cosmetics (id, category, name, price, preview_css) VALUES
  ('border_neon_pink', 'border', 'Neon Pink',    1.50, 'ring-2 ring-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]'),
  ('border_galaxy',    'border', 'Galaxy',        3.00, 'ring-2 ring-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.5)] bg-gradient-to-r from-indigo-500/10 to-purple-500/10'),
  ('border_crimson',   'border', 'Crimson',       2.00, 'ring-2 ring-red-600 shadow-[0_0_6px_rgba(220,38,38,0.5)]'),
  ('border_arctic',    'border', 'Arctic',        2.50, 'ring-2 ring-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.5)]'),
  ('border_sunset',    'border', 'Sunset',        2.00, 'ring-2 ring-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]'),
  ('border_toxic',     'border', 'Toxic',         1.50, 'ring-2 ring-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.6)]'),
  ('border_hologram',  'border', 'Hologram',      4.00, 'ring-2 ring-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.5)] animate-pulse'),
  ('border_shadow',    'border', 'Shadow',        2.50, 'ring-2 ring-zinc-600 shadow-[0_0_10px_rgba(82,82,91,0.8)]')
ON CONFLICT (id) DO NOTHING;

-- ─── NEW BADGES (8) ─────────────────────────────────────────
INSERT INTO cosmetics (id, category, name, price, preview_css) VALUES
  ('badge_champion',   'badge', 'Champion',      2.50, 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold'),
  ('badge_veteran',    'badge', 'Veteran',       1.50, 'bg-zinc-700 text-zinc-200 border border-zinc-500'),
  ('badge_clutch',     'badge', 'Clutch King',   2.00, 'bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold'),
  ('badge_dominator',  'badge', 'Dominator',     3.00, 'bg-gradient-to-r from-purple-700 to-pink-600 text-white font-bold'),
  ('badge_underdog',   'badge', 'Underdog',      1.00, 'bg-emerald-700 text-emerald-200 border border-emerald-500'),
  ('badge_sniper',     'badge', 'Sniper',        1.50, 'bg-sky-800 text-sky-200 border border-sky-400'),
  ('badge_mvp',        'badge', 'MVP',           3.50, 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-black'),
  ('badge_grinder',    'badge', 'Grinder',       1.00, 'bg-orange-800 text-orange-200 border border-orange-500')
ON CONFLICT (id) DO NOTHING;

-- ─── NEW CARD BORDERS (8) ───────────────────────────────────
INSERT INTO cosmetics (id, category, name, price, preview_css) VALUES
  ('card_cyber',       'card_border', 'Cyber',      2.50, 'border-2 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]'),
  ('card_plasma',      'card_border', 'Plasma',     3.00, 'border-2 border-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.4)]'),
  ('card_midnight',    'card_border', 'Midnight',   2.00, 'border-2 border-indigo-800 shadow-[0_0_6px_rgba(55,48,163,0.5)]'),
  ('card_aurora',      'card_border', 'Aurora',     3.50, 'border-2 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]'),
  ('card_inferno',     'card_border', 'Inferno',    2.50, 'border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'),
  ('card_ocean',       'card_border', 'Ocean',      2.00, 'border-2 border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]'),
  ('card_shadow',      'card_border', 'Shadow',     2.50, 'border-2 border-zinc-600 shadow-[0_0_8px_rgba(82,82,91,0.6)]'),
  ('card_chrome',      'card_border', 'Chrome',     4.00, 'border-2 border-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.5)]')
ON CONFLICT (id) DO NOTHING;

-- ─── NEW AVATAR EFFECTS (8) ─────────────────────────────────
INSERT INTO cosmetics (id, category, name, price, preview_css) VALUES
  ('avatar_ice',       'avatar_effect', 'Ice Aura',       1.50, 'ring-2 ring-sky-300 animate-pulse shadow-[0_0_8px_rgba(125,211,252,0.6)]'),
  ('avatar_toxic',     'avatar_effect', 'Toxic Glow',     1.50, 'ring-2 ring-lime-400 animate-pulse shadow-[0_0_8px_rgba(163,230,53,0.6)]'),
  ('avatar_galaxy',    'avatar_effect', 'Galaxy Swirl',   3.50, 'ring-2 ring-violet-400 animate-spin shadow-[0_0_12px_rgba(167,139,250,0.5)]'),
  ('avatar_shadow',    'avatar_effect', 'Shadow Cloak',   2.00, 'ring-2 ring-zinc-500 shadow-[0_0_10px_rgba(63,63,70,0.8)]'),
  ('avatar_rainbow',   'avatar_effect', 'Rainbow Prism',  5.00, 'ring-2 ring-pink-400 animate-pulse shadow-[0_0_14px_rgba(244,114,182,0.5)] bg-gradient-to-r from-red-500/10 via-green-500/10 to-blue-500/10'),
  ('avatar_storm',     'avatar_effect', 'Storm Ring',     2.50, 'ring-2 ring-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]'),
  ('avatar_plasma',    'avatar_effect', 'Plasma Core',    3.00, 'ring-2 ring-fuchsia-500 animate-pulse shadow-[0_0_12px_rgba(217,70,239,0.5)]'),
  ('avatar_golden',    'avatar_effect', 'Golden Crown',   4.50, 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.6)]')
ON CONFLICT (id) DO NOTHING;

-- ─── SEASON 2 PREVIEW (4 seasonal) ─────────────────────────
INSERT INTO cosmetics (id, category, name, price, preview_css, seasonal, expires_at) VALUES
  ('s2_diamond_crown', 'badge',         'Diamond Crown',  4.50, 'bg-gradient-to-r from-cyan-300 to-blue-500 text-white font-black shadow-[0_0_10px_rgba(34,211,238,0.5)]', TRUE, '2026-09-01T00:00:00Z'),
  ('s2_battle_scar',   'border',        'Battle Scar',    3.50, 'ring-2 ring-red-700 shadow-[0_0_8px_rgba(185,28,28,0.6)] border-dashed', TRUE, '2026-09-01T00:00:00Z'),
  ('s2_viper_ring',    'avatar_effect', 'Viper Ring',     3.00, 'ring-2 ring-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]', TRUE, '2026-09-01T00:00:00Z'),
  ('s2_ghost_badge',   'badge',         'Ghost',          2.50, 'bg-slate-800 text-slate-300 border border-slate-500 shadow-[0_0_8px_rgba(148,163,184,0.3)]', TRUE, '2026-09-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Newsletter subscribers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
