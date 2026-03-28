import dynamic from 'next/dynamic'

const PlayPageInner = dynamic(
  () => import('@/components/play/PlayPageInner').then(m => ({ default: m.PlayPageInner })),
  { ssr: false, loading: () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-3">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="card h-16 animate-pulse bg-space-700" />
        ))}
      </div>
    </div>
  )}
)

export default function PlayPage() {
  return <PlayPageInner />
}
