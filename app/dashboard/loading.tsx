export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-space-800 animate-pulse shrink-0" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-space-800 rounded animate-pulse" />
          <div className="h-3 w-32 bg-space-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card text-center p-4">
            <div className="h-7 w-16 mx-auto bg-space-800 rounded animate-pulse mb-2" />
            <div className="h-3 w-20 mx-auto bg-space-800 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Recent matches skeleton */}
      <div className="h-5 w-36 bg-space-800 rounded animate-pulse mb-4" />
      <div className="grid gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card flex items-center gap-4 p-4">
            <div className="w-8 h-8 rounded bg-space-800 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-space-800 rounded animate-pulse" />
              <div className="h-3 w-20 bg-space-800 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-space-800 rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
