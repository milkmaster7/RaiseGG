'use client'

import Link from 'next/link'
import { Gift, ChevronRight } from 'lucide-react'

export function ReferralBanner() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="relative overflow-hidden rounded-lg border border-accent-purple/30 bg-gradient-to-r from-accent-purple/10 via-space-800 to-accent-cyan/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-cyan/5 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-center gap-6 p-8">
          <div className="w-16 h-16 rounded-lg bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center flex-shrink-0">
            <Gift className="w-8 h-8 text-accent-purple" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="font-orbitron text-xl font-bold text-white mb-1">
              Invite Friends, Earn <span className="text-accent-cyan">$1 USDC</span> Each
            </h2>
            <p className="text-muted text-sm leading-relaxed">
              Share your referral link. When a friend signs up and plays, you both get $1 USDC instantly.
              Plus earn <strong className="text-white">5-10% commission</strong> on every match they win — forever.
            </p>
          </div>
          <Link
            href="/referral"
            className="btn-primary px-6 py-3 flex items-center gap-2 flex-shrink-0"
          >
            Get Your Link <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
