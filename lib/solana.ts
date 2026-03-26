import { Connection, PublicKey, Keypair } from '@solana/web3.js'

export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
export const PLATFORM_FEE_BPS = 1000 // 10% = 1000 basis points

export function getConnection(): Connection {
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  if (!rpc) throw new Error('NEXT_PUBLIC_SOLANA_RPC_URL not set')
  return new Connection(rpc, 'confirmed')
}

export function getTreasuryWallet(): PublicKey {
  const wallet = process.env.NEXT_PUBLIC_TREASURY_WALLET
  if (!wallet) throw new Error('NEXT_PUBLIC_TREASURY_WALLET not set')
  return new PublicKey(wallet)
}

export function getAuthorityKeypair(): Keypair {
  const key = process.env.SOLANA_AUTHORITY_PRIVATE_KEY
  if (!key) throw new Error('SOLANA_AUTHORITY_PRIVATE_KEY not set')
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(key)))
}

export function getProgramId(): PublicKey {
  const id = process.env.NEXT_PUBLIC_PROGRAM_ID
  if (!id) throw new Error('NEXT_PUBLIC_PROGRAM_ID not set')
  return new PublicKey(id)
}

// Calculate rake split
export function calculateRake(stakeAmount: number): {
  winnerAmount: number
  rakeAmount: number
} {
  const totalPot = stakeAmount * 2
  const rakeAmount = Math.floor((totalPot * PLATFORM_FEE_BPS) / 10000)
  const winnerAmount = totalPot - rakeAmount
  return { winnerAmount, rakeAmount }
}

// Format USDC amount (6 decimals)
export function formatUsdc(lamports: number): string {
  return (lamports / 1_000_000).toFixed(2)
}

export function usdcToLamports(usdc: number): number {
  return Math.floor(usdc * 1_000_000)
}
