import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns true if the player is an admin.
 *
 * Priority:
 * 1. ADMIN_PLAYER_IDS env var — comma-separated list of player UUIDs
 * 2. Fallback — the player with the earliest created_at (i.e. the owner/first login)
 *    This allows the platform owner to get admin on first login without any config.
 */
export async function isAdmin(
  playerId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const configured = (process.env.ADMIN_PLAYER_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (configured.length > 0) {
    return configured.includes(playerId)
  }

  // No admin IDs configured — deny access (set ADMIN_PLAYER_IDS env var to grant admin)
  return false
}
