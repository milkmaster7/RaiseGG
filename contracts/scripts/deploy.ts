import { ethers, network } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(`Deploying RaiseGGEscrow on ${network.name} from ${deployer.address}`)

  const authority = process.env.AUTHORITY_WALLET ?? deployer.address
  const treasury  = process.env.TREASURY_WALLET  ?? deployer.address

  const Escrow = await ethers.getContractFactory('RaiseGGEscrow')
  const escrow = await Escrow.deploy(authority, treasury)
  await escrow.waitForDeployment()

  const address = await escrow.getAddress()
  console.log(`RaiseGGEscrow deployed: ${address}`)
  console.log(`Set NEXT_PUBLIC_ESCROW_${network.name.toUpperCase()}=${address}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
