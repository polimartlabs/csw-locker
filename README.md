# CSW Locker

A client-side web app for interacting with **Smart Wallets on the Stacks blockchain**. Smart wallets are Clarity contracts that hold assets (STX, SIP-010 FTs, SIP-009 NFTs) on behalf of one or more users. See the [docs](https://stackerspool.gitbook.io/smart-wallet/) and [ROADMAP](ROADMAP.md).

This repository contains the UI only. Contracts live in a separate repository and are synced into `public/clarity/` — see [Contracts](#contracts) below.

## Develop

```bash
pnpm install
pnpm run dev          # Vite dev server on port 8080
pnpm run build
pnpm run lint
pnpm run test
```

No backend: blockchain data is fetched from public Hiro APIs, and signing is delegated to a Stacks wallet browser extension via `@stacks/connect`.

## Demo mode

Append `?demo=true` to any URL to explore the app with a hardcoded address. Demo mode is read-only — all write operations are no-ops.

## Contracts

Smart wallet and extension Clarity sources live in the separate [`cs-locker-contract`](https://github.com/polimartlabs/cs-locker-contract) repo. The UI reads them at runtime from `public/clarity/{mainnet,testnet}/`.

Sync contracts from the contract repo:

```bash
./scripts/sync-contracts.sh
```

By default this pulls from a sibling checkout at `../cs-locker-contract`. Override with `CONTRACTS_SRC=/path/to/repo ./scripts/sync-contracts.sh`.

### Contract types

- **Basic:** `smart-wallet-standard.clar` — minimal wallet.
- **Complicated:** `smart-wallet-with-rules.clar` + `smart-wallet-with-rules-endpoint.clar` — rules, limits, inactivity tracker.
- **Endpoint:** `smart-wallet-endpoint.clar` — stateless helper for calling extensions.
- **Extensions:** execute arbitrary logic in the name of the smart wallet. `tx-sender` and `contract-caller` inside an extension are the wallet itself. Current extensions cover sponsored STX transfers, pox-4 stacking delegation, and unsafe SIP-010 FT transfers (xBTC).

## Deployment

Netlify, SPA redirects in `netlify.toml`.
