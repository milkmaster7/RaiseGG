import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/forum — list threads
export async function GET(req: NextRequest) {
  const db = createServiceClient()
  const category = req.nextUrl.searchParams.get('category')

  let query = db
    .from('forum_threads')
    .select(`
      id, title, category, pinned, locked, created_at, updated_at,
      author:players!forum_threads_author_id_fkey(id, username, avatar_url),
      replies:forum_replies(count)
    `)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50)

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ threads: data ?? [] })
}

// POST /api/forum — create a new thread
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, body, category } = await req.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Title and body required' }, { status: 400 })
  }

  const validCategories = ['general', 'cs2', 'dota2', 'deadlock', 'teams', 'bugs', 'suggestions']
  if (category && !validCategories.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const db = createServiceClient()

  const { data: thread, error } = await db
    .from('forum_threads')
    .insert({
      title: title.trim().slice(0, 200),
      body: body.trim().slice(0, 10000),
      category: category || 'general',
      author_id: playerId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, thread })
}
