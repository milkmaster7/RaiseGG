import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 300 // cache 5 min

export async function GET() {
  const db = createServiceClient()

  // Run all counts in parallel
  const [vacBans, demos, disputes, matches] = await Promise.all([
    db.from('players').select('id', { count: 'exact', head: true }).eq('vac_banned', true),
    db.from('match_demos').select('id', { count: 'exact', head: true }),
    db.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
    db.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
  ])

  // Monthly stats (current month)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [monthlyBans, monthlyDemos, monthlyDisputes] = await Promise.all([
    db.from('players').select('id', { count: 'exact', head: true }).eq('vac_banned', true).gte('updated_at', monthStart),
    db.from('match_demos').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    db.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'resolved').gte('updated_at', monthStart),
  ])

  return NextResponse.json({
    total: {
      vacBans: vacBans.count ?? 0,
      demosRecorded: demos.count ?? 0,
      disputesResolved: disputes.count ?? 0,
      matchesVerified: matches.count ?? 0,
    },
    monthly: {
      cheatersBanned: monthlyBans.count ?? 0,
      demosReviewed: monthlyDemos.count ?? 0,
      disputesResolved: monthlyDisputes.count ?? 0,
    },
  })
}
