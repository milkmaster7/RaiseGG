export default function PlayLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-48 bg-space-800 rounded animate-pulse" />
        <div className="h-10 w-36 bg-space-800 rounded animate-pulse" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-24 bg-space-800 rounded animate-pulse" />
        ))}
      </div>

      {/* Lobby cards skeleton */}
      <div className="grid gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-full bg-space-800 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-space-800 rounded animate-pulse" />
              <div className="h-3 w-24 bg-space-800 rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-space-800 rounded animate-pulse shrink-0" />
            <div className="h-8 w-16 bg-space-800 rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
