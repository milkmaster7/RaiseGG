import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const SYSTEM_CONTEXT = `
You are a writer for RaiseGG.gg — a competitive esports stake platform for CS2, Dota 2 and Deadlock.
Players in the Caucasus, Turkey, Balkans and surrounding regions (44 countries) use USDC/USDT on Solana
to stake on 1v1 matches. Payouts are instant via a trustless Solana smart contract. No KYC, no bank required.
Platform: Steam login, Phantom wallet, 90% winner / 10% rake, ELO system (Bronze→Apex).
Telegram: t.me/raisegg. URL: raisegg.gg.

Write in a direct, knowledgeable tone — like a competitive player writing for other competitive players.
No fluff, no filler. Short sharp sentences. Practical over theoretical.

IMPORTANT RULES:
- Produce ONLY valid JSON, no markdown fences, no explanation
- HTML content uses only: <p>, <h2>, <ul>, <ol>, <li>, <strong>, <code> tags
- Slug: lowercase, hyphen-separated, no special chars, max 60 chars
- Tag must be one of: Guide, CS2, Dota 2, Deadlock, Tech
- readTime: integer 3-7
- relatedLinks: array of {href, label} — use real RaiseGG paths like /play, /games/cs2, /leaderboard, /how-it-works, /dashboard/wallet, /tournaments
- Content should be 350-600 words rendered
- Include at least 2 h2 headings
`

export async function POST(req: Request) {
  // Verify cron secret or admin
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topic } = await req.json()
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No Gemini API key' }, { status: 500 })

  const prompt = `${SYSTEM_CONTEXT}

Write a blog post about: "${topic}"

Return a single JSON object with these exact fields:
{
  "slug": "...",
  "title": "...",
  "description": "...",
  "tag": "...",
  "readTime": 5,
  "content": "<p>...</p><h2>...</h2><p>...</p>",
  "relatedLinks": [{"href": "/play", "label": "Play Now"}]
}`

  try {
    const geminiRes = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      return NextResponse.json({ error: `Gemini error: ${err}` }, { status: 500 })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Strip markdown fences if Gemini wrapped in ```json
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const post = JSON.parse(cleaned)

    // Validate required fields
    const required = ['slug', 'title', 'description', 'tag', 'readTime', 'content']
    for (const field of required) {
      if (!post[field]) return NextResponse.json({ error: `Missing field: ${field}` }, { status: 500 })
    }

    // Store in Supabase
    const supabase = createServiceClient()
    const { error: dbError } = await supabase.from('ai_blog_posts').upsert({
      slug:          post.slug,
      title:         post.title,
      description:   post.description,
      tag:           post.tag,
      published_at:  new Date().toISOString().split('T')[0],
      read_time:     post.readTime,
      content:       post.content,
      related_links: post.relatedLinks ?? [],
    }, { onConflict: 'slug' })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ success: true, slug: post.slug, title: post.title })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
