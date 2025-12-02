# Bitcoin Locker Shared Utilities

Shared TypeScript utilities for Stacks blockchain interaction.

## Usage

```typescript
import { BitcoinLockerContract, deployBitcoinLockerContract } from '@bitcoin-locker/shared';

// Deploy a contract
const result = await deployBitcoinLockerContract({
  contractName: 'bitcoin-locker-standard',
  contractCode: clarityCode,
  senderKey: privateKey,
  network: 'testnet'
});

// Interact with contract
const contract = new BitcoinLockerContract({ network: 'testnet' });
await contract.transferSTX(contractAddress, senderKey, amount, recipient);
```

## Building

```bash
pnpm build
```

This package is used by both the bot server and mini app.

