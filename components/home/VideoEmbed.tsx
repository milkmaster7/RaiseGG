export function VideoEmbed() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h2 className="font-orbitron text-3xl font-black text-center mb-4">
        <span className="text-gradient">See How It Works</span>
      </h2>
      <p className="text-muted text-center mb-10">
        From Steam login to getting paid — in under 2 minutes.
      </p>
      <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-space-800">
        {/* Placeholder until a real video is uploaded */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-full bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-accent-cyan ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white font-orbitron text-lg font-bold mb-1">How RaiseGG Works</p>
            <p className="text-muted text-sm">Connect Steam → Stake USDC → Play → Win</p>
          </div>
          <div className="grid grid-cols-3 gap-8 mt-6 text-center">
            <div>
              <div className="font-orbitron text-2xl font-bold text-accent-cyan">01</div>
              <p className="text-xs text-muted mt-1">Connect Steam</p>
            </div>
            <div>
              <div className="font-orbitron text-2xl font-bold text-accent-cyan">02</div>
              <p className="text-xs text-muted mt-1">Stake & Match</p>
            </div>
            <div>
              <div className="font-orbitron text-2xl font-bold text-accent-cyan">03</div>
              <p className="text-xs text-muted mt-1">Win & Cash Out</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
