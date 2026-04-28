# csw locker v3

## Wallets (Stacks + Bitcoin)

- **@stacks/connect** — session for Hiro-compatible wallets; we normalize STX + native BTC addresses in `src/lib/walletSession.ts`.
- **sats-connect** — L1 Bitcoin `sendTransfer` / `signPsbt` via `src/services/satsConnectAdapter.ts`.
- **Recommended test wallet: [Leather](https://leather.io)** — single session for Clarity (STX) and native BTC, aligned with the Hiro ecosystem.

Routes: `/onboarding` (personal vs group), `/locks/:walletId?` (old `/vaults/:walletId` redirects to **Locks**). **Bitcoin:** connect from the header; send and history use **Stacks | Bitcoin** tabs. **Asset Overview** on the dashboard includes **STX, sBTC, and native Bitcoin (L1)**.
