'use client'

import { useState, useEffect } from 'react'
import { Wifi } from 'lucide-react'

// Estimated ping (ms) from Istanbul game server to each country
// Based on real-world network latency data for the region
const PING_BY_COUNTRY: Record<string, number> = {
  TR: 5,   // Turkey (Istanbul local)
  GE: 15,  // Georgia
  AM: 18,  // Armenia
  AZ: 20,  // Azerbaijan
  BG: 25,  // Bulgaria
  RO: 28,  // Romania
  GR: 30,  // Greece
  MD: 30,  // Moldova
  UA: 32,  // Ukraine
  RS: 35,  // Serbia
  MK: 35,  // North Macedonia
  AL: 38,  // Albania
  BA: 38,  // Bosnia
  ME: 38,  // Montenegro
  HR: 40,  // Croatia
  HU: 40,  // Hungary
  RU: 25,  // Russia (European)
  IR: 30,  // Iran
  IQ: 35,  // Iraq
  SY: 32,  // Syria
  LB: 35,  // Lebanon
  IL: 38,  // Israel
  JO: 40,  // Jordan
  KZ: 45,  // Kazakhstan
  KW: 45,  // Kuwait
  SK: 42,  // Slovakia
  CZ: 45,  // Czechia
  AT: 42,  // Austria
  SI: 42,  // Slovenia
  IT: 42,  // Italy
  PL: 48,  // Poland
  DE: 48,  // Germany
  AE: 55,  // UAE
  QA: 55,  // Qatar
  CH: 50,  // Switzerland
  FR: 52,  // France
  NL: 52,  // Netherlands
  BE: 52,  // Belgium
  ES: 58,  // Spain
  UZ: 50,  // Uzbekistan
  TM: 40,  // Turkmenistan
  KG: 55,  // Kyrgyzstan
  TJ: 58,  // Tajikistan
  // Extended — show ping for anyone visiting
  TH: 120, // Thailand
  SE: 48,  // Sweden
  GB: 55,  // UK
  US: 120, // USA
  IN: 90,  // India
  SA: 60,  // Saudi Arabia
  EG: 55,  // Egypt
  CN: 130, // China
  JP: 140, // Japan
  KR: 130, // South Korea
  BR: 200, // Brazil
  AU: 250, // Australia
  CA: 130, // Canada
  PT: 58,  // Portugal
  DK: 48,  // Denmark
  NO: 50,  // Norway
  FI: 45,  // Finland
  LT: 42,  // Lithuania
  LV: 42,  // Latvia
  EE: 42,  // Estonia
  BY: 35,  // Belarus
}

// Valve server pings (Stockholm/Dubai) for Dota 2 and Deadlock
// These are Valve's nearest servers for the region
const VALVE_OFFSET = 8 // Valve servers are slightly further (Stockholm/Dubai)

function getPingColor(ms: number): string {
  if (ms <= 20) return 'text-green-400'
  if (ms <= 40) return 'text-accent-cyan'
  if (ms <= 55) return 'text-yellow-400'
  return 'text-orange-400'
}

function getPingLabel(ms: number): string {
  if (ms <= 20) return 'Excellent'
  if (ms <= 40) return 'Great'
  if (ms <= 55) return 'Good'
  return 'Fair'
}

export function PingEstimate() {
  const [country, setCountry] = useState<string | null>(null)
  const [ping, setPing] = useState<number | null>(null)

  useEffect(() => {
    async function detect() {
      try {
        // Use free IP geolocation to detect country
        const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
        const data = await res.json()
        const code = data.country_code ?? null
        setCountry(code)
        setPing(PING_BY_COUNTRY[code] ?? 80)
      } catch {
        // silent
      }
    }
    detect()
  }, [])

  if (!ping) return null

  const cs2Ping = ping
  const dotaPing = ping + VALVE_OFFSET
  const deadlockPing = ping + VALVE_OFFSET + 2

  return (
    <div className="mb-4">
      <div className="card max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className={`w-5 h-5 ${getPingColor(cs2Ping)}`} />
          <h3 className="font-orbitron text-sm font-bold text-white">Your Estimated Ping</h3>
          <span className="text-xs text-muted ml-auto">Server: Istanbul</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`font-orbitron text-2xl font-black ${getPingColor(cs2Ping)}`}>{cs2Ping}ms</div>
            <div className="text-xs text-muted mt-1">CS2</div>
            <div className={`text-xs font-semibold ${getPingColor(cs2Ping)}`}>{getPingLabel(cs2Ping)}</div>
          </div>
          <div className="text-center">
            <div className={`font-orbitron text-2xl font-black ${getPingColor(dotaPing)}`}>{dotaPing}ms</div>
            <div className="text-xs text-muted mt-1">Dota 2</div>
            <div className={`text-xs font-semibold ${getPingColor(dotaPing)}`}>{getPingLabel(dotaPing)}</div>
          </div>
          <div className="text-center">
            <div className={`font-orbitron text-2xl font-black ${getPingColor(deadlockPing)}`}>{deadlockPing}ms</div>
            <div className="text-xs text-muted mt-1">Deadlock</div>
            <div className={`text-xs font-semibold ${getPingColor(deadlockPing)}`}>{getPingLabel(deadlockPing)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
