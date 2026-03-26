export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-border border-t-accent-purple rounded-full animate-spin" />
        <p className="text-muted text-sm font-orbitron tracking-widest uppercase">Loading</p>
      </div>
    </div>
  )
}
