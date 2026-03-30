import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendStreamerApplicationConfirmation } from '@/lib/email'

// POST /api/streamers/apply — submit a streamer partnership application
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { twitch_username, avg_viewers, games, email, why } = body

    // Validation
    if (!twitch_username || typeof twitch_username !== 'string' || twitch_username.trim().length < 2) {
      return NextResponse.json({ error: 'Twitch username is required (min 2 characters)' }, { status: 400 })
    }

    if (!avg_viewers || typeof avg_viewers !== 'number' || avg_viewers < 1) {
      return NextResponse.json({ error: 'Average viewers must be a positive number' }, { status: 400 })
    }

    if (!games || !Array.isArray(games) || games.length === 0) {
      return NextResponse.json({ error: 'At least one game must be selected' }, { status: 400 })
    }

    const validGames = ['cs2', 'dota2', 'deadlock']
    const invalidGames = games.filter((g: string) => !validGames.includes(g))
    if (invalidGames.length > 0) {
      return NextResponse.json({ error: `Invalid games: ${invalidGames.join(', ')}. Valid: ${validGames.join(', ')}` }, { status: 400 })
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }

    // Check for duplicate application
    const supabase = createServiceClient()
    const { data: existing } = await supabase
      .from('streamer_applications')
      .select('id, status')
      .eq('twitch_username', twitch_username.trim().toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `An application for @${twitch_username} already exists (status: ${existing.status})` },
        { status: 409 }
      )
    }

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from('streamer_applications')
      .insert({
        twitch_username: twitch_username.trim().toLowerCase(),
        avg_viewers: avg_viewers,
        games: games,
        email: email.trim().toLowerCase(),
        message: why?.trim() || null,
        status: 'pending',
      })
      .select('id, created_at')
      .single()

    if (insertError) {
      console.error('[streamers/apply] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save application' }, { status: 500 })
    }

    // Send confirmation email (non-blocking — don't fail if email fails)
    try {
      await sendStreamerApplicationConfirmation(email, twitch_username)
    } catch (emailErr) {
      console.warn('[streamers/apply] Confirmation email failed:', emailErr)
    }

    return NextResponse.json({
      success: true,
      application_id: application.id,
      message: 'Application submitted! We will review it within 48 hours.',
    })
  } catch (err) {
    console.error('[streamers/apply] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
