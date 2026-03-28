import { Suspense } from 'react'
import { PlayPageInner } from '@/components/play/PlayPageInner'

export default function PlayPage() {
  return (
    <Suspense>
      <PlayPageInner />
    </Suspense>
  )
}
