import { Check, X, AlertTriangle } from 'lucide-react'

const ROWS = [
  { feature: 'Funds Protection',     raisegg: 'Solana smart contract escrow',  discord: 'Trust the stranger',       paypal: 'Chargebacks & freezes' },
  { feature: 'Payout Speed',         raisegg: '~2 seconds',                    discord: 'Hours / never',             paypal: '3-5 business days' },
  { feature: 'Anti-Cheat',           raisegg: 'VAC + demo + automated',        discord: 'None',                      paypal: 'None' },
  { feature: 'Server Quality',       raisegg: '128 tick dedicated',            discord: 'Whatever host picks',       paypal: 'Whatever host picks' },
  { feature: 'Scam Risk',            raisegg: 'Zero — code is escrow',         discord: 'Very high',                 paypal: 'Chargebacks common' },
  { feature: 'Region Support',       raisegg: 'Turkey, Caucasus, Balkans',     discord: 'Random',                    paypal: 'Not available in many countries' },
  { feature: 'Minimum Stake',        raisegg: '$2 USDC',                       discord: 'Varies',                    paypal: '$5+ with fees' },
  { feature: 'Fees',                 raisegg: '10% rake, no hidden fees',      discord: 'Middleman takes cut',       paypal: '2.9% + currency conversion' },
  { feature: 'Verification',         raisegg: 'On-chain, verify on Solscan',   discord: 'Screenshots (fakeable)',    paypal: 'Receipt (disputable)' },
]

export function ComparisonTable() {
  return (
    <section className="bg-space-800 border-y border-border py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-orbitron text-3xl font-black text-center mb-4">
          <span className="text-gradient">RaiseGG vs The Old Way</span>
        </h2>
        <p className="text-muted text-center mb-10">
          Stop trusting strangers on Discord. Stop losing money to chargebacks.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted font-normal text-xs uppercase tracking-wider">Feature</th>
                <th className="text-center py-3 px-4">
                  <span className="font-orbitron text-accent-cyan font-bold">RaiseGG</span>
                </th>
                <th className="text-center py-3 px-4 text-muted">Discord Stakes</th>
                <th className="text-center py-3 px-4 text-muted">PayPal Wagers</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature} className="border-b border-border/50 hover:bg-space-700/50 transition-colors">
                  <td className="py-3 px-4 text-white font-semibold">{row.feature}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-emerald-400 text-xs">{row.raisegg}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-red-400/70 text-xs">{row.discord}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-yellow-400/70 text-xs">{row.paypal}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
