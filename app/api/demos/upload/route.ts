import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// POST /api/demos/upload — receives GOTV demo files from MatchZy
export async function POST(req: NextRequest) {
  // MatchZy sends the demo as multipart form data
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Store demo metadata in database
    const filename = file.name
    const sizeBytes = file.size

    // Extract match info from filename (MatchZy format: {TIME}_{MATCHID}_{MAP}_{TEAM1}_vs_{TEAM2}.dem)
    const parts = filename.replace('.dem', '').split('_')

    await supabase.from('demo_files').insert({
      filename,
      size_bytes: sizeBytes,
      uploaded_at: new Date().toISOString(),
      status: 'received',
    }).single()

    // Store the actual file in Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `demos/${filename}`

    const { error: storageError } = await supabase.storage
      .from('demos')
      .upload(storagePath, buffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      })

    if (storageError) {
      console.error('[demos] Storage error:', storageError.message)
      // Still return OK — we don't want MatchZy to retry endlessly
    }

    return NextResponse.json({ ok: true, filename, size: sizeBytes })
  } catch (err) {
    console.error('[demos] Upload error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
