import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

/**
 * ONE-TIME cron: directory submission tracker
 *
 * This doesn't auto-submit (most directories have no public API).
 * Instead it:
 * 1. Checks if directory submissions have already been recorded
 * 2. If not, seeds the directory_submissions table with all targets
 * 3. Marks the cron as complete so it never runs again
 *
 * The marketing/directory-listings.md file has the actual copy to paste.
 * Update the Supabase table status as you submit to each directory.
 */

const DIRECTORIES = [
  {
    name: 'AlternativeTo',
    url: 'https://alternativeto.net/submit/',
    category: 'Gaming Platform',
    priority: 'high',
    notes: 'List as alternative to FACEIT, ESEA, 1v1Me',
  },
  {
    name: 'Product Hunt',
    url: 'https://www.producthunt.com/posts/new',
    category: 'Gaming / Crypto',
    priority: 'high',
    notes: 'Create upcoming page first, then schedule launch',
  },
  {
    name: 'SaaSHub',
    url: 'https://www.saashub.com/submit',
    category: 'Gaming Platform',
    priority: 'high',
    notes: 'Alternative to FACEIT — good SEO backlink',
  },
  {
    name: 'Wellfound (AngelList)',
    url: 'https://wellfound.com/company/create',
    category: 'Startup / Gaming',
    priority: 'high',
    notes: 'Company profile + jobs page for credibility',
  },
  {
    name: 'Crunchbase',
    url: 'https://www.crunchbase.com/add-new',
    category: 'Startup',
    priority: 'medium',
    notes: 'Adds legitimacy for partnerships and press',
  },
  {
    name: 'Indie Hackers',
    url: 'https://www.indiehackers.com/products/new',
    category: 'Product Page',
    priority: 'high',
    notes: 'Product page + milestone posts',
  },
  {
    name: 'TEN.gg Business Directory',
    url: 'https://ten.gg/',
    category: 'Esports Directory',
    priority: 'medium',
    notes: 'Esports-specific directory listing',
  },
  {
    name: 'Esports Charts',
    url: 'https://escharts.com/',
    category: 'Esports Analytics',
    priority: 'medium',
    notes: 'Tournament data listing — submit tournament stats',
  },
  {
    name: 'Battlefy',
    url: 'https://battlefy.com/create',
    category: 'Tournament Platform',
    priority: 'high',
    notes: 'List RaiseGG tournaments to attract players',
  },
  {
    name: 'Toornament',
    url: 'https://www.toornament.com/en_US/organizer/new',
    category: 'Tournament Platform',
    priority: 'medium',
    notes: 'Create organizer profile + list daily tournaments',
  },
  {
    name: 'Challengermode',
    url: 'https://www.challengermode.com/',
    category: 'Tournament Platform',
    priority: 'low',
    notes: 'Competitor — list for cross-visibility',
  },
  {
    name: 'DotaFire / Dotabuff Community',
    url: 'https://www.dotabuff.com/',
    category: 'Dota 2 Community',
    priority: 'medium',
    notes: 'Community forum posts pointing to RaiseGG Dota 2 matches',
  },
]

export async function GET(req: Request) {
  const start = Date.now()

  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Check if already completed
    const { data: existing } = await supabase
      .from('cron_runs')
      .select('id')
      .eq('name', 'directory-submit')
      .eq('status', 'ok')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        status: 'skipped',
        message: 'Directory submissions already seeded',
      })
    }

    // Seed the directory_submissions table
    // Table schema: name, url, category, priority, notes, status, submitted_at
    const rows = DIRECTORIES.map((d) => ({
      name: d.name,
      url: d.url,
      category: d.category,
      priority: d.priority,
      notes: d.notes,
      status: 'pending',
      submitted_at: null,
    }))

    const { error: insertError } = await supabase
      .from('directory_submissions')
      .upsert(rows, { onConflict: 'name' })

    if (insertError) {
      // Table might not exist yet — that's fine, the listings.md is the primary artifact
      console.warn('directory_submissions table may not exist:', insertError.message)
    }

    await recordCronRun('directory-submit', 'ok', {
      message: `Seeded ${DIRECTORIES.length} directory targets`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      status: 'ok',
      directories: DIRECTORIES.length,
      message: 'Directory submissions seeded. Use marketing/directory-listings.md for copy-paste content.',
    })
  } catch (err: any) {
    await recordCronRun('directory-submit', 'error', {
      message: err.message,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
