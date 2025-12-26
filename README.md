# ObscuraMint

ObscuraMint is a privacy-focused NFT series minting dApp on Sepolia. It stores an encrypted `obscuraOwner` address on-chain using Zama FHEVM, allowing the owner to update and decrypt that field while keeping the value hidden from everyone else.

## What this project is

ObscuraMint combines a straightforward NFT minting flow with a private ownership attribute that is encrypted at the smart contract level. Users can create an NFT series with a name and supply, view all created series, and mint from any series. The project keeps the encrypted ownership attribute on-chain, while access to its plaintext is restricted to the contract owner.

## Problems this project solves

- **On-chain privacy for ownership metadata**: Standard NFTs expose owner-related data in plaintext. This project encrypts the `obscuraOwner` address so it is not publicly readable on-chain.
- **Usability with privacy**: It preserves a familiar NFT minting flow while introducing encrypted fields that do not require off-chain custody of sensitive data.
- **Clear separation of permissions**: Only the contract owner can update and decrypt the encrypted address, preventing unauthorized disclosure.

## Key advantages

- **Encrypted ownership field**: `obscuraOwner` is stored using Zama FHEVM encryption, reducing public visibility of sensitive fields.
- **Owner-only decryption**: Decryption can only be performed by the contract owner, providing a strict access boundary.
- **Simple minting UX**: Users can browse all NFT series and mint from them in a standard Web3 flow.
- **On-chain source of truth**: The encrypted field lives on-chain, avoiding weak off-chain storage patterns.
- **Extensible architecture**: Clear separation between contracts, deployments, tasks, and the frontend enables straightforward iteration.

## Core features

- Create an NFT series with a name and total supply.
- Store an encrypted `obscuraOwner` address per series.
- List all user-created NFT series in the frontend.
- Mint tokens from any series via the UI.
- Allow only the contract owner to update and decrypt `obscuraOwner`.

## How it works

### Contracts

- The contract uses Zama FHEVM to encrypt `obscuraOwner` on-chain.
- The `obscuraOwner` field is stored as ciphertext and never exposed in plaintext through public reads.
- Contract ownership controls who can update or decrypt the encrypted field.

### Frontend

- The frontend reads data via `viem` and performs write operations with `ethers`.
- Wallet connection is provided by Rainbow.
- The UI lists all NFT series and enables minting.

### Data flow

1. A user creates an NFT series with a name and supply.
2. The contract stores the encrypted `obscuraOwner` address.
3. The frontend fetches all series data and displays them.
4. Any user can mint from a series.
5. The contract owner can update the encrypted address and decrypt it when required.

## Tech stack

- **Smart contracts**: Solidity + Hardhat
- **Privacy layer**: Zama FHEVM
- **Frontend**: React + Vite
- **Wallet integration**: Rainbow
- **Read calls**: viem
- **Write calls**: ethers
- **Package manager**: npm

## Repository structure

- `contracts`: Smart contracts
- `deploy`: Deployment scripts
- `tasks`: Hardhat tasks
- `test`: Contract tests
- `frontend`: React + Vite frontend
- `deployments`: Deployment artifacts and generated ABI
- `docs`: Zama integration docs

## Setup and usage

### Prerequisites

- **Node.js**: v20 or higher
- **npm**: For dependency management
- **Sepolia account**: With test ETH for deployment and transactions

### Install dependencies

```bash
npm install
```

### Environment configuration

Create a `.env` file in the repository root:

```bash
# PRIVATE_KEY must be a hex string WITHOUT the 0x prefix
PRIVATE_KEY=...
INFURA_API_KEY=...
ETHERSCAN_API_KEY=... # optional
```

Notes:

- Deployment uses `PRIVATE_KEY` directly. Do not use a mnemonic.
- The Sepolia deployment uses the `INFURA_API_KEY` provided above.

### Compile and test

```bash
npm run compile
npm run test
```

### Deploy locally

```bash
npx hardhat deploy --write true
```

### Deploy to Sepolia

```bash
npx hardhat deploy --network sepolia --write true
```

### Sync ABI and contract address to the frontend

The frontend must use the ABI generated in `deployments/sepolia`. Use the sync script to update it:

```bash
node scripts/sync-frontend-abi.js sepolia
```

### Run the frontend

```bash
cd frontend
npm install --no-package-lock
npm run dev
```

## Usage guide

### Create an NFT series

1. Connect your wallet in the frontend.
2. Enter a series name and total supply.
3. Submit the transaction to create the series.

### View and mint

1. Browse the list of all series in the UI.
2. Click mint for a desired series.
3. Approve the transaction in your wallet.

### Update or decrypt `obscuraOwner` (owner only)

1. Connect the contract owner wallet.
2. Update the encrypted `obscuraOwner` via the UI.
3. Use the owner-only action to decrypt when required.

## Security and privacy notes

- The encrypted `obscuraOwner` field is on-chain but unreadable without owner privileges.
- Keys are never stored in the frontend and should be managed in a secure wallet.
- Encryption and decryption are handled through Zama FHEVM flows.

## Limitations

- This project is designed for Sepolia and test usage.
- Encrypted data access relies on owner privileges; there is no public plaintext endpoint.
- Gas costs are higher than standard NFT flows due to encryption operations.

## Future roadmap

- Add advanced filtering and sorting for NFT series in the UI.
- Expand metadata support with additional encrypted fields.
- Provide richer analytics for mint activity.
- Add multi-owner or role-based permissioning for encrypted field access.
- Improve UX for decryption workflows with clearer status feedback.

## License

This project is licensed under the BSD-3-Clause-Clear License. See the `LICENSE` file for details.
