import { NextResponse } from 'next/server'
import { refreshBounties } from '@/lib/bounty-board'
import { recordCronRun } from '@/lib/monitor'
import { postToChannel } from '@/lib/telegram'

// GET /api/cron/bounty-refresh — weekly cron to recalculate bounty board
// Add to vercel.json: { "crons": [{ "path": "/api/cron/bounty-refresh", "schedule": "0 12 * * 1" }] }
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    const bounties = await refreshBounties()

    // Post bounty announcements to Telegram
    if (bounties.length > 0) {
      const lines = [
        '<b>This Week\'s Bounty Board</b>',
        '',
        ...bounties.map((b, i) => {
          const emoji = i === 0 ? '1.' : i === 1 ? '2.' : i === 2 ? '3.' : i === 3 ? '4.' : '5.'
          return `${emoji} <b>${escapeHtml(b.username)}</b> — $${b.bounty_amount} bounty (${b.win_streak}-streak, ${b.game.toUpperCase()})`
        }),
        '',
        'Beat a bounty target in a stake match to claim the bonus!',
        '',
        '<a href="https://raisegg.com/bounty">View Bounty Board</a>',
      ]

      await postToChannel(lines.join('\n'), { disablePreview: true })
    }

    await recordCronRun('bounty-refresh', 'ok', {
      message: `${bounties.length} bounties set`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ success: true, bounties })
  } catch (err) {
    await recordCronRun('bounty-refresh', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
