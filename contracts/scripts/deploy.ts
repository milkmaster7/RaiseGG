import { ethers, network } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(`Deploying RaiseGGEscrow on ${network.name} from ${deployer.address}`)

  const authority = process.env.AUTHORITY_WALLET ?? deployer.address
  const treasury  = process.env.TREASURY_WALLET  ?? deployer.address

  // USDC addresses per network
  const USDC: Record<string, string> = {
    mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    bsc:     '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // testnet USDC
  }
  const allowedTokens = USDC[network.name] ? [USDC[network.name]] : []

  const Escrow = await ethers.getContractFactory('RaiseGGEscrow')
  const escrow = await Escrow.deploy(authority, treasury, allowedTokens)
  await escrow.waitForDeployment()

  const address = await escrow.getAddress()
  console.log(`RaiseGGEscrow deployed: ${address}`)
  console.log(`Set NEXT_PUBLIC_ESCROW_${network.name.toUpperCase()}=${address}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
