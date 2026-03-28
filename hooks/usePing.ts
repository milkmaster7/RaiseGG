'use client'

import { useEffect, useState } from 'react'

const REGION_STUN: Record<string, string> = {
  EU: 'stun:stun.l.google.com:19302',
  TR: 'stun:stun.voipbuster.com:3478',
  GE: 'stun:stun.ekiga.net:3478',
  KZ: 'stun:stun.sipnet.ru:3478',
  RU: 'stun:stun.sipnet.ru:3478',
}

function measureStun(stunUrl: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: stunUrl }] })
      const start = performance.now()
      pc.createDataChannel('')
      pc.createOffer().then((o) => pc.setLocalDescription(o))
      pc.onicecandidate = (e) => {
        if (e.candidate?.type === 'srflx') {
          resolve(Math.round(performance.now() - start))
          try { pc.close() } catch { /* ignore */ }
        }
      }
      setTimeout(() => { try { pc.close() } catch { /* ignore */ } resolve(999) }, 3000)
    } catch {
      resolve(999)
    }
  })
}

export function usePing() {
  const [pings, setPings] = useState<Record<string, number | null>>(
    Object.fromEntries(Object.keys(REGION_STUN).map((r) => [r, null]))
  )

  useEffect(() => {
    Object.entries(REGION_STUN).forEach(([region, stun]) => {
      measureStun(stun).then((ms) => {
        setPings((prev) => ({ ...prev, [region]: ms }))
      })
    })
  }, [])

  return pings
}
