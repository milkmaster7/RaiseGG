import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { postBlogArticle } from '@/lib/telegram'
import { tweetBlogArticle } from '@/lib/twitter'

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const SYSTEM_CONTEXT = `
You are a writer for RaiseGG — a competitive esports stake platform for CS2, Dota 2 and Deadlock.
Players in the Caucasus, Turkey, Balkans and surrounding regions (44 countries) use USDC/USDT on Solana
to stake on 1v1 matches. Payouts are instant via a trustless Solana smart contract. No KYC, no bank required.
Platform: Steam login, Phantom wallet, 90% winner / 10% rake, ELO system (Bronze→Apex).
Telegram: t.me/raise_GG. URL: raisegg.com.

Write in a direct, knowledgeable tone — like a competitive player writing for other competitive players.
No fluff, no filler. Short sharp sentences. Practical over theoretical.

IMPORTANT RULES:
- Produce ONLY valid JSON, no markdown fences, no explanation
- HTML content uses only: <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <a>, <code>, <img>, <div>, <nav> tags
- Slug: lowercase, hyphen-separated, no special chars, max 60 chars
- Tag must be one of: Guide, CS2, Dota 2, Deadlock, Tech, Crypto, Platform
- readTime: integer 5-12
- relatedLinks: array of {href, label} — use real RaiseGG paths like /play, /games/cs2, /leaderboard, /how-it-works, /dashboard/wallet, /tournaments
- Content should be 1200-1800 words rendered
- Include at least 4 h2 headings

LINKING RULES (CRITICAL — follow exactly):
- Include 2-3 INTERNAL links within the article body using <a href="/path">anchor text</a>.
  Use real RaiseGG pages: /play, /games/cs2, /games/dota2, /games/deadlock, /tournaments,
  /leaderboard, /how-it-works, /battle-pass, /challenges, /ladders, /integrity, /premium,
  /cosmetics, /affiliate, /creators, /demos, /faq, /blog, /dashboard/wallet.
  Weave them naturally into sentences, e.g. "check the <a href="/leaderboard">live leaderboard</a> to see where you stand."
- Include 1-2 OUTBOUND links to authoritative external sources using <a href="https://..." target="_blank" rel="noopener noreferrer">anchor text</a>.
  Good sources: official game sites (counter-strike.net, dota2.com, store.steampowered.com),
  esports news (hltv.org, liquipedia.net, dotabuff.com, vlr.gg), crypto (solscan.io, solana.com).
  Link to sources that support claims in the article (patch notes, stats, wiki pages, etc.).
  NEVER link to competitors (FACEIT, Challengermode, Caucasium, etc.).
- Start with a Table of Contents wrapped in a styled nav element:
  <nav style="background:rgba(123,97,255,0.08);border:1px solid rgba(123,97,255,0.2);border-radius:8px;padding:16px 20px;margin-bottom:24px"><p style="font-weight:700;margin-bottom:8px">Table of Contents</p><ul><li><a href="#section-id">Section Title</a></li>...</ul></nav>
  Each h2 must have a matching id attribute for the TOC links.
- Include at least 1 image using this format (generates a dynamic image):
  <img src="/api/og?title=SECTION_TITLE&sub=SHORT_DESCRIPTION&color=7b61ff" alt="descriptive alt text" style="width:100%;border-radius:8px;margin:16px 0" />
  Use relevant titles/descriptions. Vary the color param: 7b61ff (purple), 00e5ff (cyan), ff6b6b (red), 22c55e (green).
  Place images after an h2 heading to illustrate each major section. Use 2-3 images total.
- End the article with a "Key Takeaways" summary box:
  <div style="background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.2);border-radius:8px;padding:16px 20px;margin-top:24px"><h2 id="key-takeaways" style="font-size:1.1rem;margin-bottom:8px">Key Takeaways</h2><ul><li>Takeaway 1</li><li>Takeaway 2</li>...</ul></div>
`

export async function POST(req: Request) {
  // Verify cron secret or admin
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topic, language = 'en' } = await req.json()
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
    en: '',
    tr: '\n\nIMPORTANT: Write the ENTIRE blog post in Turkish (Türkçe). Title, description, and content must all be in Turkish. Keep technical gaming terms in English (CS2, Dota 2, USDC, ELO, etc). The slug should still be in English/ASCII.',
    ru: '\n\nIMPORTANT: Write the ENTIRE blog post in Russian (Русский). Title, description, and content must all be in Russian. Keep technical gaming terms in English (CS2, Dota 2, USDC, ELO, etc). The slug should still be in English/ASCII.',
  }
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] ?? ''

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
  "readTime": 8,
  "content": "<nav>...</nav><p>...</p><h2 id='...'>...</h2><img src='/api/og?title=...&sub=...&color=7b61ff' alt='...' style='width:100%;border-radius:8px;margin:16px 0' /><p>...</p>...<div>Key Takeaways...</div>",
  "relatedLinks": [{"href": "/play", "label": "Play Now"}]
}${langInstruction}`

  try {
    const geminiRes = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
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
      language: language,
    }, { onConflict: 'slug' })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Post to Telegram + Twitter (best-effort, don't fail the cron)
    if (language === 'en') {
      await postBlogArticle({
        title: post.title,
        slug: post.slug,
        excerpt: post.description,
        imageUrl: `https://raisegg.com/api/og?title=${encodeURIComponent(post.title)}&sub=New+on+the+blog&color=7b61ff`,
      }).catch(() => {})
      await tweetBlogArticle({
        title: post.title,
        slug: post.slug,
        excerpt: post.description,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, slug: post.slug, title: post.title })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
