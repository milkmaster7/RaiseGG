import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '0x' + '0'.repeat(64)

const config: HardhatUserConfig = {
  paths: {
    sources: './src',
  },
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    mainnet: {
      url:      process.env.ETH_RPC_URL ?? 'https://eth.llamarpc.com',
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    bnb: {
      url:      process.env.BNB_RPC_URL ?? 'https://bsc-dataseed.binance.org',
      chainId:  56,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    sepolia: {
      url:      process.env.SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org',
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY ?? '',
      bsc:     process.env.BSCSCAN_API_KEY   ?? '',
    },
  },
}

export default config
