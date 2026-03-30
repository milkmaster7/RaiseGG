'use client'

import { useState } from 'react'
import { CreditCard, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface OnRampWidgetProps {
  walletAddress?: string
  defaultCurrency?: 'USDC' | 'USDT'
}

export default function OnRampWidget({ walletAddress, defaultCurrency = 'USDC' }: OnRampWidgetProps) {
  const [open, setOpen] = useState(false)
  const [crypto, setCrypto] = useState<'USDC' | 'USDT'>(defaultCurrency)

  const apiKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY || ''

  const transakUrl = new URL('https://global.transak.com/')
  if (apiKey) transakUrl.searchParams.set('apiKey', apiKey)
  transakUrl.searchParams.set('cryptoCurrencyCode', crypto)
  transakUrl.searchParams.set('network', 'solana')
  transakUrl.searchParams.set('defaultPaymentMethod', 'credit_debit_card')
  if (walletAddress) transakUrl.searchParams.set('walletAddress', walletAddress)
  transakUrl.searchParams.set('themeColor', '00e5ff')
  transakUrl.searchParams.set('hideMenu', 'true')

  return (
    <>
      {/* Buy button */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-5 h-5 text-accent-cyan" />
          <h2 className="font-orbitron font-bold text-white">Buy Crypto</h2>
        </div>
        <p className="text-muted text-sm">
          Don&apos;t have {crypto}? Buy directly with a credit/debit card via Transak.
        </p>

        {/* Currency toggle */}
        <div className="flex bg-space-800 border border-border rounded p-1 gap-1">
          {(['USDC', 'USDT'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCrypto(c)}
              className={`flex-1 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                crypto === c ? 'bg-accent-cyan text-space-900' : 'text-muted hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <Button
          variant="cyan"
          className="w-full"
          onClick={() => setOpen(true)}
        >
          Buy {crypto} with Card
        </Button>

        {!walletAddress && (
          <p className="text-xs text-muted text-center">Connect your wallet first to auto-fill your address.</p>
        )}
      </div>

      {/* Modal overlay with Transak iframe */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md h-[680px] bg-space-800 border border-border rounded-lg overflow-hidden shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded bg-space-700 border border-border text-muted hover:text-white hover:border-accent-cyan transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <iframe
              src={transakUrl.toString()}
              title="Buy crypto with Transak"
              allow="camera;microphone;payment"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </>
  )
}
