import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail, sendMatchResultEmail, sendStreakEmail, sendEmail } from '@/lib/email'

// POST /api/email/test — send a test email
// Body: { email: string, type: 'welcome' | 'match_result' | 'streak' | 'raw' }
export async function POST(req: NextRequest) {
  try {
    const { email, type } = await req.json()

    if (!email || !type) {
      return NextResponse.json(
        { error: 'email and type are required' },
        { status: 400 }
      )
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'welcome':
        result = await sendWelcomeEmail('TestPlayer', email)
        break

      case 'match_result':
        result = await sendMatchResultEmail(email, {
          username: 'TestPlayer',
          won: true,
          payout: 25.00,
          game: 'cs2',
          opponentName: 'OpponentGG',
        })
        break

      case 'streak':
        result = await sendStreakEmail(email, 5)
        break

      case 'raw':
        result = await sendEmail(
          email,
          'RaiseGG Test Email',
          '<h1 style="color:#00e6ff;">Test email from RaiseGG</h1><p style="color:#e0e0e0;">If you see this, the email system is working.</p>'
        )
        break

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}. Use: welcome, match_result, streak, raw` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      sent: true,
      type,
      email,
      result,
    })
  } catch (err) {
    console.error('[email/test] Error:', err)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}
