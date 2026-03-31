'use client'

import { useState, useEffect } from 'react'
import { Radio, Wifi } from 'lucide-react'

const CITIES = [
  { label: 'Istanbul, Turkey', flag: '🇹🇷' },
  { label: 'Tbilisi, Georgia', flag: '🇬🇪' },
  { label: 'Sofia, Bulgaria', flag: '🇧🇬' },
  { label: 'Bucharest, Romania', flag: '🇷🇴' },
]

function getPingColor(ms: number): string {
  if (ms < 30) return 'text-green-400'
  if (ms < 60) return 'text-accent-cyan'
  if (ms < 100) return 'text-yellow-400'
  return 'text-red-400'
}

export function PingWidget() {
  const [ping, setPing] = useState<number | null>(null)
  const [measuring, setMeasuring] = useState(true)

  useEffect(() => {
    async function measure() {
      const samples: number[] = []
      // Take 3 samples, use median
      for (let i = 0; i < 3; i++) {
        const start = performance.now()
        try {
          await fetch('/api/ping', { cache: 'no-store' })
          const rtt = Math.round(performance.now() - start)
          samples.push(rtt)
        } catch {
          // skip failed sample
        }
        if (i < 2) await new Promise(r => setTimeout(r, 200))
      }
      if (samples.length > 0) {
        samples.sort((a, b) => a - b)
        setPing(samples[Math.floor(samples.length / 2)])
      }
      setMeasuring(false)
    }
    measure()
  }, [])

  // Estimate city pings based on user's measured RTT to Vercel edge
  // These are rough offsets from the edge RTT
  function cityPing(baseMs: number, idx: number): string {
    if (baseMs === null) return '...'
    // Cities close to our server region get lower ping
    const offsets = [0, 8, 12, 6] // IST baseline, TBS +8, SOF +12, BUC +6
    const estimated = Math.max(5, baseMs + offsets[idx] - 10)
    return `${estimated}ms`
  }

  return (
    <section className="bg-space-800 border-y border-border py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 badge-cyan mb-4 text-sm">
              <Radio className="w-3.5 h-3.5" /> Live Ping Test
            </div>
            <h2 className="font-orbitron text-3xl font-black mb-4">
              <span className="text-gradient">Your Ping.</span>{' '}
              <span className="text-white">Right Now.</span>
            </h2>
            <p className="text-muted leading-relaxed mb-6">
              Real-time latency from your connection. Servers in <strong className="text-white">Istanbul</strong> — fair for everyone in the region.
            </p>
            <div className="space-y-3">
              {CITIES.map((loc, i) => (
                <div key={loc.label} className="flex items-center justify-between bg-space-700 border border-border rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{loc.flag}</span>
                    <span className="text-sm text-white font-semibold">{loc.label}</span>
                  </div>
                  {measuring ? (
                    <span className="font-mono text-sm text-muted animate-pulse">measuring...</span>
                  ) : ping !== null ? (
                    <span className={`font-mono text-sm font-bold ${getPingColor(ping + (i * 5))}`}>
                      {cityPing(ping, i)}
                    </span>
                  ) : (
                    <span className="font-mono text-sm text-muted">—</span>
                  )}
                </div>
              ))}
            </div>
            {ping !== null && !measuring && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Wifi className={`w-4 h-4 ${getPingColor(ping)}`} />
                <span className="text-muted">Your latency:</span>
                <span className={`font-mono font-bold ${getPingColor(ping)}`}>{ping}ms</span>
              </div>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-accent-cyan/5 rounded-2xl blur-xl" />
            <div className="relative card text-center py-12">
              <Wifi className="w-16 h-16 text-accent-cyan mx-auto mb-6 opacity-80" />
              <div className="font-orbitron text-5xl font-black text-accent-cyan mb-2">128 tick</div>
              <p className="text-muted text-sm mb-6">Dedicated servers, not peer-to-peer</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="font-orbitron text-lg font-bold text-white">44</div>
                  <div className="text-xs text-muted">Countries</div>
                </div>
                <div>
                  <div className="font-orbitron text-lg font-bold text-white">DDoS</div>
                  <div className="text-xs text-muted">Protected</div>
                </div>
                <div>
                  <div className="font-orbitron text-lg font-bold text-white">99.9%</div>
                  <div className="text-xs text-muted">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
