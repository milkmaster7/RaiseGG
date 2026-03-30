import { NextRequest, NextResponse } from 'next/server'
import {
  getUniversityList,
  generateOutreachEmail,
  generateAllEmails,
  type OutreachLanguage,
} from '@/lib/university-outreach'
import {
  getCafeSearchLinks,
  generateCafeOutreachMessage,
  generateFlyerContent,
  type CafeLanguage,
} from '@/lib/cybercafe-outreach'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body as { action: string }

  // ─── Universities ───────────────────────────────────────────────────────
  if (action === 'universities') {
    const universities = getUniversityList()
    const emails = generateAllEmails()

    return NextResponse.json({
      total: universities.length,
      universities,
      emails,
    })
  }

  // ─── Cafes ──────────────────────────────────────────────────────────────
  if (action === 'cafes') {
    const searchLinks = getCafeSearchLinks()
    const sampleCafes = [
      { name: 'GameZone', city: 'Istanbul', language: 'tr' as CafeLanguage },
      { name: 'CyberArena', city: 'Tbilisi', language: 'ka' as CafeLanguage },
      { name: 'NetPlay', city: 'Bucharest', language: 'ro' as CafeLanguage },
      { name: 'FragHouse', city: 'Belgrade', language: 'sr' as CafeLanguage },
      { name: 'PixelNet', city: 'Almaty', language: 'ru' as CafeLanguage },
    ]

    const sampleMessages = sampleCafes.map((c) =>
      generateCafeOutreachMessage(c.name, c.city, c.language),
    )

    const sampleFlyer = generateFlyerContent('GameZone')

    return NextResponse.json({
      totalSearchLinks: searchLinks.length,
      searchLinks,
      sampleMessages,
      sampleFlyer,
    })
  }

  // ─── Email Preview ──────────────────────────────────────────────────────
  if (action === 'email_preview') {
    const { type, language } = body as {
      type: 'university' | 'cafe'
      language?: string
    }

    if (type === 'university') {
      const { universityIndex } = body as { universityIndex?: number }
      const universities = getUniversityList()
      const index = universityIndex ?? 0

      if (index < 0 || index >= universities.length) {
        return NextResponse.json({ error: 'Invalid university index' }, { status: 400 })
      }

      const email = generateOutreachEmail(
        universities[index],
        (language as OutreachLanguage) ?? 'en',
      )

      return NextResponse.json({ email })
    }

    if (type === 'cafe') {
      const { cafeName, city } = body as { cafeName?: string; city?: string }

      if (!cafeName || !city) {
        return NextResponse.json(
          { error: 'cafeName and city are required for cafe preview' },
          { status: 400 },
        )
      }

      const message = generateCafeOutreachMessage(
        cafeName,
        city,
        (language as CafeLanguage) ?? 'en',
      )
      const flyer = generateFlyerContent(cafeName)

      return NextResponse.json({ message, flyer })
    }

    return NextResponse.json({ error: 'type must be "university" or "cafe"' }, { status: 400 })
  }

  return NextResponse.json(
    { error: 'Unknown action. Use: universities, cafes, email_preview' },
    { status: 400 },
  )
}
