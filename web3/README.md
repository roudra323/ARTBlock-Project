# .env

SEPOLIA_PRIVATE_KEY = ""

ALCHEMY_SEPOLIA_API_KEY =""

OWNER_ADDRESS = ""

VITE_CONTRACT_ADDRESS = ""

ETHERSCAN_API_KEY = ""

VITE_RAINBOWKIT_KEY = ""


# Deploy smart contract
`npx hardhat run --network sepoila scripts/deploy.js`

# Verify smart contract
`npx hardhat verify CONTRACT_ADDR --network sepoila`
