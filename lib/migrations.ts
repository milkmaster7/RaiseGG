/**
 * lib/migrations.ts — Auto-migration runner for RaiseGG
 *
 * Reads .sql files from /migrations folder, checks which have been run
 * (tracked in _migrations table), and executes pending ones via exec_sql RPC.
 *
 * BOOTSTRAP (run once in Supabase SQL Editor):
 *
 * CREATE TABLE IF NOT EXISTS _migrations (
 *   id         SERIAL PRIMARY KEY,
 *   name       TEXT NOT NULL UNIQUE,
 *   ran_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   success    BOOLEAN NOT NULL DEFAULT true,
 *   error      TEXT
 * );
 *
 * CREATE OR REPLACE FUNCTION exec_sql(query text)
 * RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
 * BEGIN
 *   EXECUTE query;
 *   RETURN json_build_object('ok', true);
 * EXCEPTION WHEN OTHERS THEN
 *   RETURN json_build_object('ok', false, 'error', SQLERRM);
 * END;
 * $$;
 */

import { createServiceClient } from '@/lib/supabase'

interface MigrationResult {
  name: string
  success: boolean
  error?: string
}

/** Get list of already-run migrations */
async function getCompletedMigrations(): Promise<Set<string>> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('_migrations')
    .select('name')
    .eq('success', true)

  return new Set((data || []).map(m => m.name))
}

/** Execute a single SQL migration */
async function executeMigration(name: string, sql: string): Promise<MigrationResult> {
  const supabase = createServiceClient()

  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql })

    if (error) {
      // Record failed migration
      await supabase.from('_migrations').insert({
        name,
        success: false,
        error: error.message,
      })
      return { name, success: false, error: error.message }
    }

    const result = data as { ok: boolean; error?: string }
    if (!result.ok) {
      await supabase.from('_migrations').insert({
        name,
        success: false,
        error: result.error,
      })
      return { name, success: false, error: result.error }
    }

    // Record successful migration
    await supabase.from('_migrations').insert({
      name,
      success: true,
    })

    return { name, success: true }
  } catch (err) {
    const error = String(err)
    try { await supabase.from('_migrations').insert({ name, success: false, error }) } catch {}
    return { name, success: false, error }
  }
}

/** Run all pending migrations from the MIGRATIONS registry */
export async function runPendingMigrations(): Promise<{
  ran: MigrationResult[]
  skipped: string[]
  total: number
}> {
  const completed = await getCompletedMigrations()
  const ran: MigrationResult[] = []
  const skipped: string[] = []

  for (const migration of MIGRATIONS) {
    if (completed.has(migration.name)) {
      skipped.push(migration.name)
      continue
    }

    const result = await executeMigration(migration.name, migration.sql)
    ran.push(result)

    // Stop on first failure
    if (!result.success) break
  }

  return { ran, skipped, total: MIGRATIONS.length }
}

/** Check if bootstrap is done (exec_sql function exists) */
export async function isBootstrapped(): Promise<boolean> {
  const supabase = createServiceClient()
  try {
    const { error } = await supabase.rpc('exec_sql', { query: 'SELECT 1' })
    return !error
  } catch {
    return false
  }
}

// ─── Migration Registry ───────────────────────────────────────────────────────
// Add new migrations here. They run in order. Each runs exactly once.
// Name format: NNN_description (must be unique)

const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: '026_faucet_claims',
    sql: `
      CREATE TABLE IF NOT EXISTS faucet_claims (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        amount      NUMERIC(10,2) NOT NULL DEFAULT 0.50,
        claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        converted   BOOLEAN NOT NULL DEFAULT false,
        UNIQUE(player_id)
      );
      CREATE INDEX IF NOT EXISTS idx_faucet_claims_player ON faucet_claims(player_id);
      CREATE INDEX IF NOT EXISTS idx_faucet_claims_date ON faucet_claims(claimed_at);
    `,
  },
  {
    name: '027_player_streaks',
    sql: `
      CREATE TABLE IF NOT EXISTS player_streaks (
        user_id             UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        current_streak      INT NOT NULL DEFAULT 0,
        longest_streak      INT NOT NULL DEFAULT 0,
        last_match_date     DATE,
        insurance_available BOOLEAN NOT NULL DEFAULT false,
        insurance_last_used TIMESTAMPTZ,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_player_streaks_streak ON player_streaks(current_streak DESC);
    `,
  },
  {
    name: '028_revenge_challenges',
    sql: `
      CREATE TABLE IF NOT EXISTS revenge_challenges (
        id            TEXT PRIMARY KEY DEFAULT substr(gen_random_uuid()::text, 1, 12),
        challenger_id UUID NOT NULL REFERENCES players(id),
        opponent_id   UUID REFERENCES players(id),
        stake_amount  NUMERIC NOT NULL CHECK (stake_amount >= 1),
        game          TEXT NOT NULL CHECK (game IN ('cs2', 'dota2', 'deadlock')),
        message       TEXT,
        status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at    TIMESTAMPTZ NOT NULL,
        accepted_by   UUID REFERENCES players(id),
        accepted_at   TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_revenge_challenges_challenger ON revenge_challenges(challenger_id);
      CREATE INDEX IF NOT EXISTS idx_revenge_challenges_status ON revenge_challenges(status);
      ALTER TABLE revenge_challenges ENABLE ROW LEVEL SECURITY;
    `,
  },
  {
    name: '029_bounty_board',
    sql: `
      CREATE TABLE IF NOT EXISTS bounty_board (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id     UUID NOT NULL REFERENCES players(id),
        username      TEXT,
        avatar_url    TEXT,
        win_streak    INT NOT NULL DEFAULT 0,
        bounty_amount NUMERIC(10,2) NOT NULL DEFAULT 2.00,
        game          TEXT,
        active        BOOLEAN NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_bounty_board_active ON bounty_board(active);

      CREATE TABLE IF NOT EXISTS bounty_claims (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id               UUID,
        bounty_target_id       UUID REFERENCES players(id),
        bounty_target_username TEXT,
        claimer_id             UUID REFERENCES players(id),
        claimer_username       TEXT,
        bounty_amount          NUMERIC(10,2) NOT NULL,
        game                   TEXT,
        claimed_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  },
  {
    name: '030_roulette_queue',
    sql: `
      CREATE TABLE IF NOT EXISTS roulette_queue (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
        game       TEXT NOT NULL CHECK (game IN ('cs2', 'dota2', 'deadlock')),
        min_stake  NUMERIC(10,2) NOT NULL CHECK (min_stake > 0),
        max_stake  NUMERIC(10,2) NOT NULL CHECK (max_stake >= min_stake),
        joined_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_roulette_queue_game ON roulette_queue(game);
      CREATE INDEX IF NOT EXISTS idx_roulette_queue_joined ON roulette_queue(joined_at);
      ALTER TABLE roulette_queue ENABLE ROW LEVEL SECURITY;
    `,
  },
  {
    name: '031_triple_threat',
    sql: `
      CREATE TABLE IF NOT EXISTS triple_threat_series (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        challenger_id UUID NOT NULL REFERENCES players(id),
        opponent_id   UUID NOT NULL REFERENCES players(id),
        stake_amount  NUMERIC NOT NULL CHECK (stake_amount >= 5),
        games         JSONB NOT NULL DEFAULT '["cs2","dota2","deadlock"]',
        results       JSONB NOT NULL DEFAULT '[]',
        status        TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','in_progress','completed','cancelled')),
        winner_id     UUID REFERENCES players(id),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_triple_threat_challenger ON triple_threat_series(challenger_id);
      CREATE INDEX IF NOT EXISTS idx_triple_threat_opponent ON triple_threat_series(opponent_id);
      CREATE INDEX IF NOT EXISTS idx_triple_threat_status ON triple_threat_series(status);
    `,
  },
  {
    name: '032_coach_bets',
    sql: `
      CREATE TABLE IF NOT EXISTS coach_bets (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coach_id       UUID NOT NULL REFERENCES players(id),
        student_id     UUID NOT NULL REFERENCES players(id),
        match_id       UUID NOT NULL,
        amount         NUMERIC NOT NULL CHECK (amount > 0),
        status         TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','won','lost','cancelled')),
        coach_payout   NUMERIC,
        student_payout NUMERIC,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_coach_bets_coach ON coach_bets(coach_id);
      CREATE INDEX IF NOT EXISTS idx_coach_bets_student ON coach_bets(student_id);
      CREATE INDEX IF NOT EXISTS idx_coach_bets_match ON coach_bets(match_id);
      CREATE INDEX IF NOT EXISTS idx_coach_bets_status ON coach_bets(status);
    `,
  },
  {
    name: '033_referrals',
    sql: `
      CREATE TABLE IF NOT EXISTS referrals (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        referred_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        code          TEXT NOT NULL,
        bonus_claimed BOOLEAN NOT NULL DEFAULT false,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(referred_id)
      );
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);

      ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES players(id);
    `,
  },
  {
    name: '035_achievements_definitions',
    sql: `
      -- Achievement definitions table (seeded catalog)
      CREATE TABLE IF NOT EXISTS achievements (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT NOT NULL,
        icon        TEXT NOT NULL DEFAULT '🏅',
        category    TEXT NOT NULL DEFAULT 'special'
                    CHECK (category IN ('wins', 'streaks', 'social', 'special')),
        threshold   INTEGER NOT NULL DEFAULT 1,
        game        TEXT
      );

      -- Seed ~20 achievements
      INSERT INTO achievements (id, name, description, icon, category, threshold, game) VALUES
        ('first_win',          'First Win',          'Win your very first match',                    '🏆', 'wins',    1,    NULL),
        ('five_wins',          'Five Wins',          'Win 5 matches',                                '⭐', 'wins',    5,    NULL),
        ('ten_wins',           'Ten Wins',           'Win 10 matches',                               '🌟', 'wins',    10,   NULL),
        ('fifty_wins',         'Fifty Wins',         'Win 50 matches',                               '🎖️', 'wins',    50,   NULL),
        ('hundred_wins',       'Hundred Wins',       'Win 100 matches',                              '💯', 'wins',    100,  NULL),
        ('first_blood',        'First Blood',        'Win your very first match ever',               '⚔️', 'wins',    1,    NULL),
        ('streak_3',           'On Fire',            'Achieve a 3-win streak',                       '🔥', 'streaks', 3,    NULL),
        ('streak_5',           'Unstoppable',        'Achieve a 5-win streak',                       '⚡', 'streaks', 5,    NULL),
        ('streak_10',          'Legendary Streak',   'Achieve a 10-win streak',                      '💀', 'streaks', 10,   NULL),
        ('underdog',           'Underdog',           'Beat a player 200+ ELO above you',             '🐺', 'special', 1,    NULL),
        ('revenge',            'Revenge',            'Win a revenge match',                          '🗡️', 'special', 1,    NULL),
        ('globe_trotter',      'Globe Trotter',      'Beat players from 5 different countries',      '🌍', 'social',  5,    NULL),
        ('triple_threat_win',  'Triple Threat',      'Win matches in all 3 games',                   '🎮', 'wins',    1,    NULL),
        ('roulette_winner',    'Roulette Winner',    'Win a roulette match',                         '🎰', 'special', 1,    NULL),
        ('high_roller',        'High Roller',        'Win a $100+ stake match',                      '💰', 'special', 1,    NULL),
        ('faucet_graduate',    'Faucet Graduate',    'Place your first real stake after using faucet','🎓', 'special', 1,    NULL),
        ('city_champion',      'City Champion',      'Become the top player in your city',           '🏙️', 'special', 1,    NULL),
        ('bounty_hunter',      'Bounty Hunter',      'Claim a bounty from the bounty board',         '🎯', 'special', 1,    NULL),
        ('social_butterfly',   'Social Butterfly',   'Refer 3 players to the platform',              '🦋', 'social',  3,    NULL),
        ('veteran',            'Veteran',            'Play 100 total matches',                       '🎖️', 'wins',    100,  NULL)
      ON CONFLICT (id) DO NOTHING;

      -- Ensure player_achievements has achievement_id column alongside legacy achievement column
      ALTER TABLE player_achievements ADD COLUMN IF NOT EXISTS achievement_id TEXT REFERENCES achievements(id);
      ALTER TABLE player_achievements ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_player_achievements_aid ON player_achievements(achievement_id);
    `,
  },
  {
    name: '036_streamer_applications',
    sql: `
      CREATE TABLE IF NOT EXISTS streamer_applications (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        twitch_username TEXT NOT NULL,
        avg_viewers     INT NOT NULL,
        games           TEXT[] NOT NULL,
        email           TEXT NOT NULL,
        message         TEXT,
        status          TEXT NOT NULL DEFAULT 'pending',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_streamer_apps_status ON streamer_applications(status);
      CREATE INDEX IF NOT EXISTS idx_streamer_apps_twitch ON streamer_applications(twitch_username);
    `,
  },
  {
    name: '037_city_column',
    sql: `
      ALTER TABLE players ADD COLUMN IF NOT EXISTS city TEXT;
      CREATE INDEX IF NOT EXISTS idx_players_city ON players(city) WHERE city IS NOT NULL;
    `,
  },
]
