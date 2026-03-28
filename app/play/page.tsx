'use client'

import dynamic from 'next/dynamic'

const PlayPageInner = dynamic(
  () => import('@/components/play/PlayPageInner').then(m => ({ default: m.PlayPageInner })),
  { ssr: false }
)

export default function PlayPage() {
  return <PlayPageInner />
}
