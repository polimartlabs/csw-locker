# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm install
pnpm run dev          # Vite dev server on port 8080
pnpm run build        # Production build to dist/
pnpm run build:dev    # Development mode build
pnpm run preview
pnpm run lint
pnpm run test         # Vitest
pnpm run test:ui
pnpm run test:coverage
```

## Architecture

CSW Locker is a client-side smart contract wallet UI for the **Stacks blockchain**. There is no backend — all blockchain interaction happens via public Hiro APIs and the user's Stacks wallet browser extension.

### Key Layers

- **Pages** (`src/pages/`): Route components. Main routes use `:walletId` param (e.g. `/dashboard/:walletId`, `/send/:walletId`).
- **Components** (`src/components/`): Built on shadcn/ui (Radix UI + TailwindCSS). Custom button variants in `ui/` subfolder.
- **Contexts** (`src/contexts/`): Global state via React Context. Provider nesting order matters — see `AppProviders.tsx`.
- **Hooks** (`src/hooks/`): Logic composition. Most data-fetching hooks wrap services with React Query.
- **Services** (`src/services/`): Plain classes/functions, not React-specific.
- **Utils** (`src/utils/`): Pure helpers (chain detection, number formatting, Clarity value decoding).

### Provider Hierarchy (order matters)

```
QueryClientProvider → WalletConnectionProvider → NetworkProvider → SmartWalletProvider → DemoModeProvider → Routes
```

### Network Detection

Network (mainnet/testnet) is auto-detected from the connected wallet address prefix: `SP`/`SM` = mainnet, `ST`/`SN` = testnet. Drives API base URLs (`api.mainnet.hiro.so` vs `api.testnet.hiro.so`). See `src/utils/chain-config.ts`.

### Transaction Flow

Transactions are built in `src/services/txServices.ts` using `@stacks/transactions` Clarity builders, then signed via `@stacks/connect` which delegates to the user's wallet extension.

### Demo Mode

`?demo=true` activates demo mode with a hardcoded address. All write operations must be no-ops in demo — do not call signing or broadcast APIs. Gate mutation entrypoints on `useDemoMode()`.

### Contracts

Clarity sources live in a **separate repo** (`cs-locker-contract`) and are copied into `public/clarity/{mainnet,testnet}/` via `./scripts/sync-contracts.sh`. Do not edit `.clar` files here — edit upstream and re-sync.

### Key Dependencies

- **@stacks/connect**: Wallet connection and transaction signing
- **@stacks/transactions**: Clarity value construction
- **@tanstack/react-query**: Server state caching
- **react-hook-form + zod**: Form handling and validation

### TypeScript

Strict mode is OFF. Path alias `@/*` maps to `src/*`. Target ES2020.

### Deployment

Netlify with SPA redirects (`netlify.toml`).
