export const runtime = 'edge'

export async function GET() {
  return new Response('ok', {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain',
    },
  })
}
