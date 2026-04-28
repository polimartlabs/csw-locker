# Development log

## 2026-04-24 — Vault unlocking flow + Personal vaults + plain-English copy

- **Personal (solo) vaults** (`lib/btcScript.ts`): new `deriveSoloP2wshVault` — witness script `<ownerPubkey> OP_CHECKSIG` wrapped in P2WSH. Named on-chain pocket only the owner can spend from. Added `createSoloBtcVaultRecord` in `btcVaultStorage.ts` with a `kind: "solo" | "multisig"` field and a `getVaultKind` helper for back-compat on legacy rows.
- **`CreateBtcVault.tsx`**: fully rewritten with a kind picker (Personal / Shared) as step 1. Solo flow skips the signer step entirely — two-step wizard. Multisig flow keeps the signer step but with plainer copy (no BIP-67 / P2WSH / m-of-n jargon). On success we redirect to the vault view instead of the wallet selector.
- **Send flow (`BtcVaultView.tsx`)**: rewired into a single `phase` state machine — `idle → building → awaiting-sign → signing → ready → broadcasting → sent`. For solo vaults the user signs once and gets a Broadcast button; for multisig the PSBT is surfaced for collection and auto-detects threshold via local `Transaction.finalize()`. Percent chips (25/50/75/Max), USD echo, inline fee summary, explorer link on success.
- **`lib/btcVaultSpend.ts`** (new): shared PSBT builder used by the vault page. Handles coin selection, feerate picking, solo vs multisig vsize estimation, dust handling.
- **Copy trim**: removed user-facing references to “P2WSH”, “CLTV”, “CHECKLOCKTIMEVERIFY”, “non-custodial”, “BIP-67”, “m-of-n”, “deterministic”, “preview-only”, etc. from `Locks.tsx`, `BtcVaultCard.tsx`, `CreateBtcVault.tsx`, `BtcVaultView.tsx`. Lock disclaimer is now “Funds lock on-chain until the unlock date…”.
- **`BtcVaultCard.tsx`**: badges now show `Personal` (with user icon) or `X of Y` (with users icon) instead of `N-of-M P2WSH`.

## 2026-04-24 — Locks page: user-facing copy only

- Removed internal “why not vaults” / product-modeling block from `Locks.tsx`. Single “Coming soon” card with short user-facing bullets (BTC, STX, shared control).

## 2026-04-24 — Send UX, header STX/USD, bolder header

- **Send:** Dark-themed tab triggers (no default light `bg-background` on active), full-width tab bar, copy/callout when `walletId` missing, Stacks wizard gated behind route param, Btc send panel: labeled inputs, from-address in a code box, a11y `htmlFor`/`id`, removed extra `<Toaster />`s from `WizardStepRenderer`.
- **WalletLayout:** **CoinGecko** STX/USD on mount, **Charisma** still preferred when its USD price is valid; `useParams` network sync effect depends only on `walletId` (avoids bad loop); balance hook uses `walletId ?? ""`.
- **Header:** Truncated **STX** address + copy in STX cell; **font-extrabold** / **font-bold** for amounts and USD (STX + BTC).

## 2026-04-24 — BTC in Asset Overview; Vaults → Locks; product copy

- **Asset Overview** (`AssetOverview.tsx`): **Bitcoin (L1)** row via `useBtcWallet` (balance, USD, Connect / Send); **total** header sums STX + sBTC + native BTC USD; STX line uses 2 d.p.
- **Nav:** removed **Vaults** from desktop + mobile sidebars; **`/vaults/:walletId`** redirects to **`/locks/:walletId`**; deleted `Vaults.tsx`.
- **Dashboard** intro: smart wallet deploy framed as **BTC-vault–like**; multisig, threshold, new in-app wallet; **Locks** page expanded (same + “shared control” blurb). `ui-v3/README.md` route blurb updated.

## 2026-04-24 — Compact header, STX/USD fix, Locks page

- `WalletLayout`: when Charisma/`.stx` price fails, **CoinGecko** (`fetchStxUsdPrice` / `lib/stxPrice.ts`) fills STX/USD; balance display **2** decimals. USD shows `—` only when price unavailable.
- `WalletHeader`: single tight row (reduced padding, small labels, no heavy cards) — STX and BTC as compact strips; “From wallet” → small **STX** hint + title on BTC cell; slimmer account/network controls.
- New route **`/locks/:walletId?`** (`Locks.tsx`): coming soon, copy for **native Bitcoin non-custodial** locks and **STX** locks; **Locks** nav enabled (desktop + mobile) instead of disabled “Soon”.

## 2026-04-24 — Header: BTC address with STX; fewer BTC decimals

- `formatBtcFromSats` in `utils/numbers.ts` (max 5 fraction digits, no forced trailing zeros). Used in `WalletHeader` and `MobileNavigationDrawer` instead of 6–8 decimals.
- When STX is present and a BTC (L1) address exists: truncated BTC is shown in the **BTC balance card** with copy; **Accounts** button (`md+`) shows STX and BTC on two lines; **mobile nav drawer** STX/BTC block shows a truncated BTC line under the balance.

## 2026-04-24 — Header accounts: Taproot (P2TR) in dropdown

- `BtcWalletContext`: `getAccounts` requests Payment + Ordinals; persists optional `taprootAddress` from Ordinals / P2TR; exposes `taprootAddress` (sats session or `walletData.taprootBtc`).
- `WalletHeader` Accounts menu: second row **Taproot (P2TR)** with copy when it differs from the payment (L1) address; unified label **Bitcoin · Taproot (P2TR)** when payment is Taproot or same as `taprootAddress`.

## 2026-04-24 (revision) — BTC UX realignment

- Removed `/native-btc` route and sidebar link; added `BtcWalletProvider` + header CTA **Connect Bitcoin wallet** with BTC amount/USD (Mempool + CoinGecko).
- **Send** and **History** use **Stacks | Bitcoin** tabs; L1 send lives in `BtcSendPanel`.
- Sidebar: **Locks** = coming soon (disabled); **Vaults** page copy = coming soon.
- `btcMempoolService` for L1 address balance and tx list for history tab.

## 2026-04-24 — Single-wallet BTC via @stacks/connect + custom time picker

- **`BtcWalletContext`:** rewritten to go through the main `WalletContext` (i.e. `@stacks/connect`). No more `sats-connect` provider or `csw_btc_account_v1` persistence. `activeBtcAddress` = `walletData.preferredBtc`; `connectBtcWallet()` now delegates to `connectWallet()`. Consumer interface preserved (`satsBtcAddress` = `null`, `disconnectDedicatedBtc` = no-op) so the header’s Unlink disappears automatically.
- **Send path:** `Locks.tsx` and `BtcSendPanel.tsx` use `request('sendTransfer', { recipients })` from `@stacks/connect`. Cancellations handled via JSON-RPC `4001`.
- **Cleanup:** removed `services/satsConnectAdapter.ts`; dropped `sats-connect` + `@sats-connect/core` from `package.json`. Help copy updated (header tooltip, BTC send empty state).
- **`components/ui/time-picker.tsx`:** new Radix `Select`-based hour / minute / AM-PM picker (5-min steps by default, dark theme). Replaces the native `<input type="time">` on the Locks page. `toHHmm` now snaps its initial value to the picker step.

## 2026-04-24 — BTC Lock UX: percent chips, slider, calendar date picker

- **`pages/Locks.tsx`:** pulls `balanceSats` / `loadingBalance` from `useBtcWallet` to show *Available BTC + USD* next to the amount field.
- **Percent chips** (10 / 25 / 50 / 75 / Max) + **slider** (0–100%) write the amount deterministically from sats, so there is no float drift.
- Live echo: `{percent}% of balance`, `sats`, and `≈ $USD` (from `useAssetPrices().btcUsd`); red helper when amount exceeds balance.
- Replaced `datetime-local` with **shadcn `Popover` + `Calendar`** for the date (past dates disabled) and an `<input type="time">` for the time; combined into a single `Date`, still enforced ≥ 1 h from now; on success we reset to *+24 h*.

## 2026-04-24 — BTC Lock feature (Stacks locks coming soon)

- **`lib/deriveBtcLockAddress.ts`:** deterministic Taproot-style preview lock address per `(lockId, owner, unlockUnix)`; ready to swap for a real CLTV P2WSH/P2TR script via `bitcoinjs-lib` without changing storage.
- **`lib/btcLockStorage.ts`:** `csw_btc_locks_v1` with `createBtcLockRecord` / `updateBtcLock` / `removeBtcLock` and `BTC_LOCKS_CHANGED_EVENT` for live list refresh.
- **`pages/Locks.tsx`:** Bitcoin / STX tabs. BTC tab:
  - Connect BTC CTA when unconnected; sending address preview.
  - Form: amount (BTC) + unlock datetime (min +1h) + optional note; USD + sats echo; Mempool feerate hint.
  - `sats-connect` `sendTransfer` to the derived lock address → record `txid`, status `broadcast`, toast, reset inputs.
  - Lock list with status chips (pending / broadcast / locked confirmed / unlock window open), explorer link, copy txid/address, remove.
  - Background poll (60s) of Mempool `/address/{lock}/txs` to move `broadcast → confirmed`, and to flip `confirmed → unlockable` when `unlockUnix` passes.
- STX tab: "coming soon" card, same routing as before.

## 2026-04-24 — BTC vault list: derived address + “View” coming soon

- **`lib/deriveBtcVaultAddress.ts`:** SHA-256–deterministic Taproot-**style** preview string (`bc1p` / `tb1p` from linked L1), not spendable on-chain.
- **`lib/btcVaultStorage.ts`:** local list `csw_btc_vaults_v1`, `appendBtcVault`, `BTC_VAULTS_CHANGED_EVENT` for same-tab refresh.
- **`CreateBtcVault`:** shows derived preview; **Add to my wallets** saves and returns to the selector.
- **`BtcVaultCard` + `WalletSelector`:** vaults in the same grid as smart wallets; **View vault** disabled with tooltip *coming soon*; copy on derived address.

## 2026-04-24 — App wiring: asset prices + Create BTC vault route

- **`App.tsx`:** `AssetPricesProvider` wraps `BtcWalletProvider` (STX/BTC spot flows from one context into BTC balance USD). Route **`/create-btc-vault`** → `CreateBtcVault.tsx` (placeholder multi-step flow).
- **`WalletSelector`:** `stxUsdLabel` uses **`pricesLoading`** from `useAssetPrices` so USD shows `—` until the shared spot is ready.
- **`WalletSelectorHeader`:** `satsBtcAddress` is used directly for unlink/show flags (renamed from `hasDedicatedBtc`).

## 2026-04-24 — BTC wallets, onboarding, vaults (ui-v3)

- Unified `WalletContext` with `useWalletConnection` (single source); added `walletSession.ts` with `preferredStx` / `preferredBtc`.
- Installed `sats-connect`; added `satsConnectAdapter.ts`, `bitcoinTxService.ts` (Mempool feerates + explorer links), `NativeBtcSend` page.
- Added `/onboarding` (personal vs group, localStorage), redirect from `/wallet-selector` when connected and not completed.
- Added `/vaults/:walletId?` policy/vault spike page; sidebar links for Vaults and Native Bitcoin.
- Extended `chain-config` for native BTC address prefixes; added `embeddedWalletPolicy.ts` placeholder for future WaaS.

## 2026-04-24 — Fix `JsonRpcError` on BTC lock create

Root cause: `deriveBtcLockAddressPreview` produced a `bc1p…` string without a valid BIP-173 checksum, so Leather rejected `sendTransfer` with `JsonRpcError` (InvalidParams). Our `catch` also compared `code === 4001`, which never matches the `@stacks/connect` error codes (`-32000` / `-31001`).

- **`lib/btcLockStorage.ts`:** `createBtcLockRecord` now sets `lockAddress = ownerBtcAddress` (MVP self-send) and keeps the deterministic string as `previewScriptHint` for future migration to a real CLTV P2WSH/P2TR script. Type-guard updated.
- **`pages/Locks.tsx`:** imports `JsonRpcError` + `JsonRpcErrorCode` from `@stacks/connect`; new `parseStacksRpcError` helper surfaces `message` + `data` and classifies `UserRejection` / `UserCanceled` as "Cancelled". Added preflight checks (dust limit 546 sats, balance guard). UI label changed to **Funded address** with an honest MVP note.
- **`components/send/BtcSendPanel.tsx`:** same error-handling upgrade — real `JsonRpcError` branch instead of the bogus `4001` check.

## 2026-04-24 — Pass `network` to `sendTransfer` (fix `InsufficientFunds` on testnet addresses)

Leather's `BitcoinCoinSelectionService` was throwing `BitcoinError: InsufficientFunds` because `stacksRequest("sendTransfer", …)` defaulted to mainnet UTXO selection while the connected wallet was holding funds on **testnet3**. The address in our `BtcWalletContext` is already network-tagged, so we now forward that hint:

- **`pages/Locks.tsx` & `components/send/BtcSendPanel.tsx`:** import `getClientConfig` from `@/utils/chain-config`, infer `"mainnet" | "testnet"` from `activeBtcAddress` (via its bech32/legacy prefix), and pass it as `network` on the `sendTransfer` params. No change needed to Leather or to our address discovery — the wallet picks the correct BTC account using the supplied network string.

## 2026-04-24 — Platform fee + live on-chain lock state + UTC-safe dates

Three pain points the user flagged in one turn: (1) no way to charge a platform fee to the CSW treasury; (2) the Locks UI showed stale "pending" status on freshly confirmed tx; (3) dates looked arbitrary — "Unlocks 4/24/2026 3:40 PM · in ~8 h" for something created minutes earlier — with no time-zone disambiguation.

- **`lib/platformFee.ts` (new):** single source of truth for the CSW treasury fee. Env-overridable (`VITE_CSW_TREASURY_BTC_MAINNET` / `_TESTNET`, `VITE_CSW_FEE_BPS`, `_MIN_SATS`, `_CAP_SATS`). Defaults: 10 bps (0.10%), min 546 sats, cap 50k sats. `computeBtcPlatformFee(amount, network)` is **fail-open** — if no treasury is configured for the active network the fee is silently skipped, so we never route funds to a placeholder.
- **Lock funding (`pages/Locks.tsx → handleCreateLock`):** `sendTransfer` now takes *two* recipients when a fee is enabled — the CLTV P2WSH lock output *and* a second output to the treasury. Balance check (`exceedsBalanceWithFee`) and the new fee-summary card both account for the extra cost. Disclosed to the user right above the "Lock BTC" button.
- **Lock sweep (`lib/btcLockSpend.ts`):** `buildUnlockPsbt` now attaches the treasury output inside the PSBT itself (so the lock's owner pays the fee at redemption time). `BuildUnlockPsbtResult` gains `platformFeeSats` + `platformFeeTreasury`. vsize budget grows by 31 vB when a fee output is present.
- **Vault spend (`lib/btcVaultSpend.ts`):** same pattern — platform-fee output is added before change, coin-selection loop now covers `amount + miner fee + platform fee`, result struct surfaces the new fields. `BtcVaultView` renders a "Platform fee" row in the spend summary when non-zero.
- **Adaptive poller (`pages/Locks.tsx`):** replaced the flat 45 s interval with a back-off ladder (5 s → 10 s → 20 s → 45 s). Every new lock resets the cadence to 5 s via the `locks.length` dep. Visibility returns also reset. Polling now pulls three on-chain signals per lock in parallel: `/tx/{txid}/status`, `/blocks/tip/height`, and `/address/{lockAddress}` — so we surface balance + confirmations even when mempool.space hasn't re-indexed the owner's tx list yet. Sweep tx status is tracked independently so the UI keeps updating after `status === "spent"`.
- **On-chain state row:** each lock row now shows *On-chain balance / Funding tx / Sweep tx* ("In mempool", "N conf.") pulled from the poller. First visible signal lands within ~5 s of creating a lock.
- **Time handling:** new `formatRelativeTime(unix, now, "future" | "past")` returns `"in 45s" / "12s ago" / "in ~8 h" / "2 d ago"` — crucially handles sub-minute deltas so a just-created row renders as `just now` instead of `in ~0 h`. `formatAbsolute(ms)` appends the short time-zone name (e.g. `GMT+2`) so the absolute stamp is unambiguous. The `now` ticker went from 30 s → 5 s so the relative strings stay live.


## 2026-04-24 21:18 — Collapsible lock cards + conclusive time labels

- `pages/Locks.tsx`: each lock row now uses `Collapsible` with a compact summary (`amount`, `status`, `unlock`, `created/funded`) and a `Details` toggle for long technical sections (addresses, txids, on-chain breakdown, note, optional remove button).
- Timing hardening in lock rows: `Unlocks` and `Created/Funded` now both show **local time + explicit UTC line**, and relative labels now use floor/ceil logic (no ambiguous rounding drift).
- Added guard for indexer clock skew: if `fundedAtUnixSec` appears in the future by more than 2 minutes, UI falls back to local `createdAt` and shows a warning banner instead of displaying misleading future-funded timestamps.

## 2026-04-24 22:05 — Status chip derived from wall-clock + on-mount promotion

- `chipFor()` in `pages/Locks.tsx` now derives "Unlock window open" purely from `unlockUnixSec <= now && lock.txid` — catches stale `confirmed`/`broadcast` rows whose unlock time has passed but whose persisted `status` wasn't yet promoted. Also adds a terminal `Unlocked · swept` chip for `status === "spent"` so completed locks don't get ambiguous labeling.
- On Locks-page mount, any `confirmed` row whose `unlockUnixSec` has elapsed is promoted to `unlockable` immediately via `updateBtcLock` — no 5s wait for the first poll cycle. Prevents the "lock past its unlock time still shows Locked · confirmed" flicker users reported.


## 2026-04-24 22:40 — Fix `signPsbt` TypeError on unlock / vault spend

- `@stacks/connect` v8's runtime marshaller for Leather's legacy `signPsbt` shape calls `params.signInputs.map(...)` unconditionally — even though the TS type declares `signInputs?` as optional. Omitting it triggered `TypeError: Cannot read properties of undefined (reading 'map')` inside `@stacks_connect.js` and killed the claim/sweep flow.
- Fix: `Locks.tsx` (`handleUnlock`) and `BtcVaultView.tsx` (`handleSign`) now pass an explicit `signInputs = [0, 1, ..., inputCount-1]` array built from the PSBT's input count, asking the wallet to sign every input. No behavior change on the wallet side — the sig set is the same one we always intended.

## 2026-04-24 23:05 — Manual finalizer for CLTV-P2WSH lock spends

- After `signPsbt` started returning successfully (previous fix added the required `signInputs`), `tx.finalize()` blew up with `Error: Unknown inputs not allowed` from `@scure/btc-signer`'s `finalizeIdx`. The library only auto-finalizes inputs whose witnessScript matches one of its built-in shapes (P2WPKH, BIP-67 multisig, taproot…); our CLTV script `<unlockTime> CLTV DROP <pubkey> CHECKSIG` isn't one of them.
- Added `ui-v3/src/lib/btcLockFinalize.ts` → `finalizeCltvSpendPsbt(signedPsbtBase64, lock)`. It loads the PSBT with `allowUnknownInputs: true`, pulls each input's `partialSig` matching the lock's `ownerPubkey`, and writes `finalScriptWitness = [signature, witnessScript]` directly via `updateInput`. Then `tx.extract()` produces the broadcastable raw tx and `tx.id` gives the txid.
- `Locks.tsx → handleUnlock` now calls the new finalizer instead of `tx.finalize()`. Removed the now-unused `Transaction` and `base64` imports from the page.

## 2026-04-24 23:55 — Locks popup spam fix + Dashboard pricing + Vault dashboard view

- **Wallet popup spam on Locks page open (`pages/Locks.tsx` + `lib/btcLockHeal.ts`):** the passive auto-heal effect was calling `tryHealLock(lock, walletData)` for every legacy lock on mount; each call fell through to `resolveOwnerPubkey()` → `stacksRequest("getAddresses")`, opening a Leather popup per lock. `tryHealLock` now takes `{ allowWalletPrompt }` (default `false`). Background heal uses session-cached pubkeys + mempool-history fallback only — never prompts the wallet. Click-time heal in `handleUnlock` opts in (`allowWalletPrompt: true`) so "Recover & sweep" still works.
- **AssetOverview (`components/dashboard/AssetOverview.tsx`):** rewrote as a single `AssetRow[]` model that's sorted by descending USD value before render. Rows with unknown USD (still loading, or no price) sink to the bottom. Each row now also shows `$X.XX / SYMBOL` spot price beneath the USD column for clarity. Switched the price source from `useGetRates` to the centralized `useAssetPrices()` (BTC + STX), so STX, sBTC, and native BTC L1 all use the same canonical spot prices.
- **Dashboard stat cards (`pages/Dashboard.tsx`):** "Total Balance" and "USD Value" used to count STX only. Now "Holdings" shows a multi-asset summary (`X STX · Y sBTC · Z BTC`) and "Total USD value" sums STX + sBTC + native BTC L1 via `useAssetPrices()`. No more flickering from the tiny STX-only number jumping to the full total.
- **BtcVaultView (`pages/BtcVaultView.tsx`):** rebuilt to mirror the dashboard layout — three-up stat cards (Vault balance / USD value / Policy), Quick Actions (Send / Deposit / Explorer / Refresh), 2-col grid (single-asset Vault assets card + Recent activity scoped to the vault address via `getAddressTxs`), optional multisig signer card, then the existing send flow card. Send / sign / broadcast logic preserved verbatim — only the visual scaffolding changed. URL stays `/btc-vault/:vaultId`.

## 2026-04-25 00:30 — On-chain fallback recovery for BTC locks

- Added `ui-v3/src/lib/btcLockRecovery.ts`: pure-JS recovery that rebuilds `BtcLockRecord`s from the connected BTC address's transaction history when localStorage was wiped (cleared site data, dev server restart on a different port, fresh browser, etc.). Two complementary paths:
  1. **Spent-lock recovery (deterministic):** scans every recent vin's witness; when a `[signature, witnessScript]` pair decodes to our exact CLTV shape (`<unlockUnixSec> CLTV DROP <pubkey33> CHECKSIG`) we extract `unlockUnixSec` + `ownerPubkey`, verify the implied address matches the spent prevout, and reconstruct a fully-known record with `status: "spent"` and `spendTxid` populated.
  2. **Unspent-lock candidates (heuristic):** for every owner-funded `vout` with `scriptpubkey_type === "v0_p2wsh"`, persist a record with the known fields (`lockAddress`, `txid`, `vout`, `amountSats`, `fundedAtUnixSec`) and queue a tiered brute-force on `unlockUnixSec` using the connected wallet's pubkey. Tiers: minute resolution for the first 60 days after funding, hourly out to 5 years, daily out to 20 years. First match wins; the record is patched with `witnessScriptHex` + `scriptPubkeyHex` so the regular unlock flow can sweep it. Yields to the event loop every 4096 candidates so the page stays interactive.
- Added `getTxFull(txid, networkHint)` to `services/btcMempoolService.ts` returning the full mempool.space tx shape (vin with `prevout` + `witness`, vout with `scriptpubkey_type`). This is what the recovery scanner consumes.
- Added `upsertBtcLock(record)` to `lib/btcLockStorage.ts` so the recovery module can insert reconstructed records without bypassing the storage's notification + validation pipeline.
- `pages/Locks.tsx` runs `recoverAndPersistLocks(...)` once per `(activeBtcAddress, sessionPubkey)` pair on mount, gated by a `useRef` cache key. Pulls the owner's compressed pubkey straight from the wallet session (`preferredBtc`/`taprootBtc`/`addresses.btc`) — never prompts the wallet, so the popup-spam fix from earlier still holds. Shows a toast if any new locks were merged in.
- UI safety: lock rows now treat `unlockUnixSec === 0` as a "recovering…" sentinel — the "Unlocks" cell shows `Unknown — recovering…` instead of "Jan 1, 1970", and `windowOpen` is forced false until the brute-force resolves the time.

## 2026-04-25 01:10 — Recovery follow-ups: friendly heal error + deterministic vault activity direction

- **`lib/btcLockHeal.ts`:** clicking "Recover & sweep" on a chain-recovered candidate whose `unlockUnixSec` was still `0` (sentinel meaning "background search hasn't resolved this yet") was hitting `buildCltvWitnessScript` and surfacing the raw `Unlock time must be a Unix timestamp greater than 500,000,000` error to the user. `tryHealLock` now bails early with a friendly message ("We're still searching the chain for this lock's unlock time. Hang on a moment and try again.") whenever `unlockUnixSec ≤ 500_000_000`, deferring to the recovery brute-force.
- **`pages/BtcVaultView.tsx` recent activity:** the previous row classification was "any vout pays the vault → deposit", which mislabeled every spend (each vault spend has a change-back output paying the vault). Switched to a deterministic flow rule: a row is a *deposit* IFF the vault address appears in **no** vin and in ≥1 vout; otherwise it's a *spend*. Computed by fetching `getTxFull(txid)` for the top 6 rows and summing `vault-in-vins` vs `vault-in-vouts`. Spend rows now also display the magnitude that actually left the vault (`|inFromVault − outToVault|`, i.e. payment + miner fee), prefixed `−`, instead of the raw vault-only output sum.

## 2026-04-25 02:15 — Faster lock recovery + collapsible "New BTC lock" card

- **`lib/btcLockRecovery.ts` brute-force tiers reordered & exposed for re-runs:** the previous tier-1 search was a single 60-day minute window (≈86 K candidates), which is fast on first match but slow when the unlock time is just hours away (every miss has to scan the whole window). Split tier-1 into two: `[fundedAt − 1h, fundedAt + 48h]` minute resolution (≈3 K, sub-100 ms — catches every short test lock) before falling through to the wider 60-day window. Hour-out-to-5y and day-out-to-20y stages preserved.
- **`resolveUnknownUnlockTimes(...)` (new export):** iterates persisted locks where `unlockUnixSec ≤ 500_000_000` and re-runs the brute-force using the connected wallet's pubkey. Required because `recoverLocksFromChain` only enqueues *net-new* candidates — once a candidate is persisted, subsequent mounts would skip it and the user would stare at "Unknown — recovering…" forever. `recoverAndPersistLocks` now fires this for free.
- **`pages/Locks.tsx` recovery effect:** on first mount per `(addr, pubkey)` we still do the full chain scan; on subsequent renders of the same pair we just call `resolveUnknownUnlockTimes` (cheap, no network) so refreshing the page or reconnecting the wallet eventually resolves stuck candidates. Toasts when ≥1 are resolved.
- **`pages/Locks.tsx` chip honesty (`chipFor`):** rows with unknown `unlockUnixSec` (chain-recovered candidates) used to display "Unlock window open" because `0 * 1000 ≤ now`. Now they show a "Recovering unlock time…" amber pill with a spinner until the brute-force resolves them.
- **Collapsible "New BTC lock" card (`pages/Locks.tsx`):** wrapped the create-lock card in a `Collapsible` that's closed by default — the existing locks list (the thing users come here for after their first session) now owns the viewport. Clicking the header opens the form; a successful broadcast auto-collapses it again so the new entry slides into the list cleanly. Header shows "Lock new funds" / "Hide" plus a rotating chevron for affordance.

## 2026-04-25 15:45 - Merge conflict recovery for btc-locks-vaults vs upstream/dev

- Resolved all Git unmerged paths by preserving the `btc-locks-vaults` branch versions for conflicted files and retaining non-conflicting upstream additions already present in the merge index. This removed all `UU/UD` conflict states and restored a clean working tree.
- Fixed post-merge regressions: removed stale `ui/sonner` import from `src/App.tsx`, added missing dependencies (`@stacks/blockchain-api-client`, `@stacks/common`) to `ui-v3/package.json`/lockfile, and added a backward-compatible `useUserWalletConnection` export in `src/hooks/useWalletConnection.ts` so newer unified-header consumers still compile.

## 2026-04-27 16:50 — Vault flow continuation (settings shutdown + lock pubkey fallback)

- `ui-v3/src/pages/BtcVaultSettings.tsx`: added an on-chain shutdown workflow in vault settings (build shutdown PSBT, sign with wallet, broadcast, then remove local vault record), and fixed hook ordering/dependency issues so settings render is stable.
- `ui-v3/src/pages/BtcVaultView.tsx`: removed duplicated shutdown state/handlers after relocating shutdown actions to settings, keeping the dashboard focused on receive/send/history and reducing conflicting flows.
- `ui-v3/src/pages/Locks.tsx`: hardened lock creation pubkey resolution by always falling back to vault signer pubkey in vault mode, preventing missing-session pubkey failures during vault-backed lock creation.

## 2026-04-28 05:55 — User-scoped vault/lock isolation + vault receive cleanup

- `ui-v3/src/lib/btcVaultStorage.ts` + `ui-v3/src/lib/btcLockStorage.ts`: tightened scoped-localStorage behavior so once a scoped key exists (even empty) it no longer rehydrates from legacy global keys; this isolates per-wallet state on shared devices and prevents deleted items from silently returning from fallback migration.
- `ui-v3/src/lib/btcVaultStorage.ts`: added scoped deleted-vault tombstones and applied them during load/migration to make vault deletion permanent in UI until explicitly recreated/imported.
- `ui-v3/src/pages/BtcVaultView.tsx` + `ui-v3/src/pages/ReceiveAssets.tsx`: removed vault QR/deposit-request controls from dashboard cards and moved the BTC vault QR/request URI flow into the vault receive page surface.
- `ui-v3/src/lib/btcLockSpend.ts` + `ui-v3/src/pages/Locks.tsx`: removed strict unlock-time pre-veto and let unlock continue as a full-balance sweep attempt path even when unlock time recovery is not yet resolved.
- `ui-v3/src/pages/BtcVaultSignatures.tsx`: fixed multisig signer collaboration route typo and added a short coordination code display derived from vault script fingerprint to improve signer coordination checks.

## 2026-04-28 20:50 — Vault receive/send route parity + BTC history detail pass

- `ui-v3/src/pages/SendAssets.tsx` + `ui-v3/src/App.tsx` + `ui-v3/src/pages/BtcVaultSend.tsx`: added a dedicated vault send route/page (`/btc-vault/:vaultId/send`) and routed vault send entries there instead of embedding send only inside the dashboard surface.
- `ui-v3/src/pages/BtcVaultView.tsx`: quick-action deposit/send now route to dedicated pages (`/receive/:vaultId` and `/btc-vault/:vaultId/send`) instead of relying on in-dashboard controls only.
- `ui-v3/src/pages/ReceiveAssets.tsx`: vault receive now keeps QR value as the plain vault address, shows BTC asset info and top ordinal previews, and adds a deposit button that opens a wallet `sendTransfer` request to the vault address using the input BTC amount.
- `ui-v3/src/pages/ActionHistory.tsx`: bitcoin tab now includes expandable transaction details (inputs, outputs, net flow, fee) with mempool-style on-chain context and shared scrollbar behavior; also normalized STX pricing usage via `AssetPricesContext` for consistency with dashboard/overview surfaces.

## 2026-04-28 20:56 — Policy preset expansion + USD parity cleanup

- `ui-v3/src/pages/BtcVaultSettings.tsx`: added explicit policy preset controls: solo timelock quick presets (`24h`, `7d`, `30d`) and multisig spending posture presets (`conservative`, `balanced`, `aggressive`) that map to enforceable threshold/timelock inputs before script rebuild.
- `ui-v3/src/pages/BtcVaultSettings.tsx`: added stronger input validation for threshold and timelock unix values before attempting script rebuild, so invalid policy values fail with clear user-facing errors.
- `ui-v3/src/components/dashboard/AssetOverview.tsx`: removed local lock-total aggregation from overview total calculation and kept `computePortfolioUsd` input focused on STX/sBTC/native BTC balances only, avoiding double-counting against dashboard’s locked-BTC card and tightening USD parity across surfaces.

## 2026-04-28 06:35 — Vault receive/send UX parity + bitcoin history detail pass

- `ui-v3/src/pages/ReceiveAssets.tsx`: vault-mode receive now keeps QR payload as address-only, shows BTC balance + top 3 ordinals, and adds a "Deposit to vault" button that opens a wallet `sendTransfer` request using the entered BTC amount.
- `ui-v3/src/pages/BtcVaultView.tsx`: quick-action "Send" now opens the dedicated vault send page (`/btcvault/:vaultId/send`) instead of jumping to the dashboard section; quick-action deposit remains routed to vault receive page.
- `ui-v3/src/pages/ActionHistory.tsx`: bitcoin tab now uses a stack-style scroll container and expands each tx to show net flow, input/output rows, and fee details (mempool-derived), instead of hash-only rows.
- `ui-v3/src/components/dashboard/RecentActivity.tsx` + `ui-v3/src/pages/ActionHistory.tsx`: STX price usage now comes from `AssetPricesContext` for consistency with other pages and fewer one-off refetch spikes.
- `ui-v3/src/pages/Dashboard.tsx`: locked BTC headline text sizing was tightened for responsive rows to prevent layout distortion on smaller widths.

## 2026-04-27 17:10 — User-isolated storage + signer coordination hardening

- Added `ui-v3/src/lib/userScope.ts` and switched user-facing local state (`onboardingStorage`, `networkPreference`, `recipientStorageService`, `SmartWalletContext`) to scoped keys tied to the active signed-in wallet scope, with legacy-key migration fallback so existing device data is preserved but separated per user going forward.
- Tightened vault signer coordination in `ui-v3/src/lib/btcVaultStorage.ts`: share links now include a vault coordination fingerprint, and import rejects tampered payloads or same-id collisions with mismatched signer/script configuration to prevent cross-signer confusion.
- Strengthened `ui-v3/src/pages/BtcVaultSignatures.tsx`: added signer-membership checks against connected wallet pubkeys, PSBT-to-vault input validation (script match), and signature progress indicators (`collected/required`) before allowing broadcast.

## 2026-04-27 15:20 — Vault delete UX, selector balances, vault-route rendering, enforceable policy updates

- `ui-v3/src/pages/BtcVaultView.tsx`: added safe delete flow for unfunded vaults (`balance === 0`) with explicit confirmation prompt, and route-aware section focusing so vault pages opened via `/send/:vaultId`, `/receive/:vaultId`, or `/history/:vaultId` auto-scroll to the corresponding vault section.
- `ui-v3/src/components/wallet-selector/BtcVaultCard.tsx`: added live vault balance fetch/render on selector cards and kept solo/multisig badge context visible for faster vault triage.
- `ui-v3/src/components/DesktopSidebar.tsx` and `ui-v3/src/components/MobileNavigationDrawer.tsx`: in vault mode, Send/Receive/History now route through the shared pages (`/send/:walletId`, `/receive/:walletId`, `/history/:walletId`) instead of hash-only links.
- `ui-v3/src/pages/SendAssets.tsx`, `ui-v3/src/pages/ReceiveAssets.tsx`, `ui-v3/src/pages/ActionHistory.tsx`: vault ids now render `BtcVaultView` directly on these routes (no redirect loop), preserving vault context while using the same navigation entry points.
- `ui-v3/src/lib/btcScript.ts`, `ui-v3/src/lib/btcVaultStorage.ts`, `ui-v3/src/pages/BtcVaultSettings.tsx`: added enforceable script-policy update path (solo `standard`/`timelock` and multisig threshold rebuild), with script/address regeneration and a safety gate that blocks policy updates while a vault has funds.

## 2026-04-27 15:35 — Revert vault route embedding + enforce post-free vault gate

- `ui-v3/src/pages/SendAssets.tsx`, `ui-v3/src/pages/ReceiveAssets.tsx`, `ui-v3/src/pages/ActionHistory.tsx`: reverted vault-id handling from inline `BtcVaultView` rendering back to redirects into `btc-vault` anchors, restoring expected smart-wallet page behavior and avoiding vault-dashboard takeover in send/receive/history routes.
- `ui-v3/src/components/DesktopSidebar.tsx`, `ui-v3/src/components/MobileNavigationDrawer.tsx`: reverted vault mode send/receive/history links to `#vault-send`, `#vault-receive`, `#vault-history` deep links on the vault page.
- `ui-v3/src/pages/CreateBtcVault.tsx`: added a hard gate to block unpaid vault creation beyond the first 2 free vaults; now vault #3+ creation is prevented with a fee-required error until payment wiring is implemented.

## 2026-04-27 15:55 — Restore original Create Wallet UX flow

- `ui-v3/src/pages/CreateWallet.tsx`: fully restored the original create-wallet page flow and UI structure provided by the user (header profile menu, network switcher, wallet name/description form, extension checklist, summary card, and simulated create action).
- `ui-v3/src/data/walletExtensions.ts`: reintroduced `getSortedExtensions()` compatibility data source expected by the original flow, derived from existing `CONTRACT_TYPES` extension metadata so the restored page compiles and renders extension options.

## 2026-04-27 16:00 — Vault creation fee payment workflow (pay before create)

- `ui-v3/src/pages/CreateBtcVault.tsx`: implemented paid-tier workflow so vaults beyond the free quota now require an on-chain STX transfer approval before the vault record is created. Flow is now: compute tier fee -> prompt fee approval (`stx_transferStx`) -> create vault only after a successful fee txid.
- Added review-step fee UX for paid tiers (USD + STX estimate and explicit pre-create payment notice), and wired fee amount calculation by policy (`solo` starts at `$1.2`, multisig scales by threshold up to `$3`).
- Added runtime safeguards for missing treasury configuration, disconnected STX sender, and unavailable STX/USD quote to prevent creating unpaid paid-tier vaults.

## 2026-04-27 16:20 — Multi-rail fee payment + funded-delete safeguards + taproot ordinal indexing

- `ui-v3/src/pages/CreateBtcVault.tsx`: added user-selectable fee payment rail and chain for paid-tier vault creation (`Stacks/STX` or `Bitcoin/BTC`). Creation now executes the selected on-chain payment request first (`stx_transferStx` for STX or `sendTransfer` for BTC), then creates the vault only on successful txid.
- `ui-v3/src/pages/CreateBtcVault.tsx`: improved paid-tier review UX with both STX and BTC quote visibility and explicit payment-rail selection so users can choose asset/chain before submitting.
- `ui-v3/src/pages/BtcVaultView.tsx`: hardened delete behavior by warning and blocking delete attempts when vault balance is non-zero, including the legacy delete path, to prevent funded vault disappearance from local listings.
- `ui-v3/src/services/btcMempoolService.ts`: added taproot ordinals indexing helper (`getTaprootOrdinalInscriptions`) using a public ordinals API with graceful fallback.
- `ui-v3/src/pages/BtcVaultView.tsx`: added ordinal holdings display row in vault assets panel (taproot address + inscription count + sample id preview) to surface taproot/ordinal assets in the BTC asset display area.

## 2026-04-24 19:20 — End-to-end BTC vault conditional rendering + vault policy/settings surfaces

- Introduced a dedicated vault-mode route boundary in `ui-v3/src/lib/vaultRoute.ts` and applied route guards in STX-only pages (`GenericActions`, `ContractActions`, `ContractDetails`, `Stacking`, `WalletDetails`) so vault IDs no longer render smart-wallet/STX services; they now redirect to vault-native pages.
- Added vault-native pages and routes: `ui-v3/src/pages/BtcVaultPolicies.tsx` and `ui-v3/src/pages/BtcVaultSettings.tsx`, wired in `ui-v3/src/App.tsx` as `/btc-vault/:vaultId/policies` and `/btc-vault/:vaultId/settings`, with policy-first BTC script review and multisig-member label management.
- Added shared layout mode split: `WalletLayout`, `WalletHeader`, `DesktopSidebar`, and `MobileNavigationDrawer` now support `mode="btc-vault"`, hide STX surfaces in vault mode, and render vault-specific navigation (Dashboard, Send, Receive, History, Locks, Policies, Settings) while removing smart-wallet menus like Contract Actions/Extensions/Contract Details.
- Updated `BtcVaultView` to pass vault metadata into vault-mode layout and expanded vault storage API with `updateBtcVault` in `ui-v3/src/lib/btcVaultStorage.ts` to support settings updates cleanly through shared storage/events.

## 2026-04-24 19:35 — Vault menu deep-link fix + duplicate key warning removal

- Fixed React duplicate-key warnings in vault navigation (`DesktopSidebar`/`MobileNavigationDrawer`) by making vault menu routes unique with hash deep-links (`#vault-send`, `#vault-receive`, `#vault-history`) and using stable composite keys (`path+label`) for rendered nav items.
- Implemented vault-section deep links end-to-end by anchoring `BtcVaultView` sections with IDs (`vault-send`, `vault-receive`, `vault-history`) and active-nav matching against `pathname + hash` so menu state is accurate while staying on the vault dashboard route.

## 2026-04-24 19:50 — Vault-funded BTC locks + stricter vault/smart-wallet separation

- `ui-v3/src/pages/Locks.tsx`: added vault-aware lock mode (`getVaultFromRouteId`) so `/locks/:walletId` can operate as a vault-native lock screen when `walletId` is a BTC vault id. In vault mode, the page uses `WalletLayout` in `btc-vault` mode, shows vault source metadata, hides STX lock tab, and scopes lock list to that vault only.
- `Locks.tsx`: `handleCreateLock` now supports two funding paths: (1) regular wallet transfer (existing behavior) and (2) vault-funded lock creation via `buildVaultSpendPsbt` + `signPsbt` + finalize+broadcast. This enables vault balances to lock BTC directly on-chain.
- `ui-v3/src/lib/btcLockStorage.ts`: added `sourceVaultId` on lock records and create input, including type-guard support; used by lock list filtering so smart-wallet locks and vault locks are not mixed.
- Vault lock UX updates: lock source address and available balance now resolve from vault context in vault mode, and lock CTA copy reflects vault signing flow (`Sign vault tx` / `Lock from vault`).

## 2026-04-24 20:00 — Lock source badges + vault-reflective sidebar labels

- `ui-v3/src/pages/Locks.tsx`: added a per-lock funding source badge in each lock row header (`Vault` vs `Wallet`) using the persisted `sourceVaultId`, so mixed histories clearly show where each lock came from.
- `ui-v3/src/components/DesktopSidebar.tsx` and `ui-v3/src/components/MobileNavigationDrawer.tsx`: in vault mode, renamed the lock menu label to `Vault Locks` so the sidebar/navigation explicitly reflects vault context instead of generic locks wording.

## 2026-04-24 19:20 — Vault shutdown flow + strict vault/smart-wallet data separation

- Added a full vault shutdown path in `ui-v3/src/pages/BtcVaultView.tsx`: users can start shutdown, sign, and broadcast a sweep-all transaction back to their connected BTC address; on success the vault is removed from local vault storage.
- Added `buildVaultShutdownPsbt` in `ui-v3/src/lib/btcVaultSpend.ts` for deterministic sweep-all PSBT construction (all vault UTXOs, miner fee budgeting, optional platform-fee output, no change output), supporting both solo and multisig vaults.
- Implemented multisig approval semantics for shutdown in `BtcVaultView`: shared vaults can circulate/import shutdown PSBTs for co-signing, and broadcast only once enough approvals are collected.
- Enforced strict data-domain separation by guarding smart-wallet pages from vault IDs: `Dashboard`, `SendAssets`, `ReceiveAssets`, and `ActionHistory` now route vault IDs to `btc-vault` pages instead of rendering Stacks smart-wallet data with BTC vault context.

## 2026-04-24 19:40 — Lock recovery + wallet prompt suppression + forced 1% platform fee

- `ui-v3/src/lib/btcOwnerPubkey.ts`: removed `getAddresses` wallet-RPC fallback from owner-pubkey resolution. BTC lock/vault flows now use existing in-session BTC pubkeys only, preventing extra wallet popup prompts before actual signing requests.
- `ui-v3/src/pages/Locks.tsx`: strengthened unknown unlock-time recovery by trying all matching BTC pubkeys from the current wallet session (owner field + preferred/taproot/address list) before failing, improving recovery success for legacy candidate locks.
- `ui-v3/src/lib/platformFee.ts`: hard-pinned BTC platform fee rate to `100` bps (`1%`) regardless of env fee-bps values, while keeping treasury and min/cap address configuration intact.

## 2026-04-24 20:05 — Finalized unlock/shutdown reliability and vault UI pass

- `ui-v3/src/lib/btcOwnerPubkey.ts`: reintroduced a controlled wallet RPC fallback (`allowWalletRpc`) so unlock/recovery can request `getAddresses` when session pubkeys are missing, while keeping non-interactive flows silent by default.
- `ui-v3/src/pages/Locks.tsx` + `ui-v3/src/lib/btcLockHeal.ts`: unlock/recover now tries all local candidate pubkeys first, then explicitly falls back to wallet RPC for missing pubkeys. This restores the reconnect path for stuck recovered locks without forcing reconnect on every BTC action.
- `ui-v3/src/lib/btcVaultSpend.ts`: enforced a safer minimum shutdown/send feerate floor (`>= 5 sat/vB`) to reduce mempool rejection risk that surfaced as `POST /tx 400` during vault shutdown broadcasts.
- `ui-v3/src/pages/BtcVaultView.tsx`: moved vault page into `WalletLayout` and tightened heading/layout structure so the vault screen matches app surfaces more closely and no longer feels like a standalone rough page.

## 2026-04-24 20:25 — Unrecoverable unknown-time lock terminal state

- Added deterministic recovery terminal state fields in `ui-v3/src/lib/btcLockStorage.ts`: `unknownUnlockResolveAttempts` and `unknownUnlockUnrecoverable` on lock rows.
- `ui-v3/src/lib/btcLockRecovery.ts`: after exhaustive unlock-time brute-force misses, increment attempts and mark rows unrecoverable at threshold (`>=3`) with note `"Not a CSW lock script"`, instead of leaving rows in indefinite recovering state.
- `ui-v3/src/pages/Locks.tsx`: unknown-time rows now show a terminal status chip/message (`Not a CSW lock script`) and stop presenting the recover/unlock CTA when marked unrecoverable, giving users a deterministic final UI state.

## 2026-04-24 20:55 — Create-lock pubkey fallback, shutdown dust guard, vault-route undefined fix

- `ui-v3/src/pages/Locks.tsx` + `ui-v3/src/pages/CreateBtcVault.tsx`: restored wallet-RPC pubkey fallback (`allowWalletRpc: true`) for create/sign BTC actions so missing session pubkeys no longer block lock/vault creation with reconnect errors.
- `ui-v3/src/lib/btcVaultSpend.ts`: added dust guard for platform-fee outputs in vault spend/shutdown builders; treasury output is skipped when fee would be below dust to prevent non-standard tx broadcast rejections (`POST /tx 400`).
- `ui-v3/src/components/WalletLayout.tsx`, `DesktopSidebar.tsx`, `MobileNavigationDrawer.tsx`: hardened route generation with wallet-id fallback and safe default paths (`/wallet-selector`) so vault views no longer render links with `undefined`.
- `ui-v3/src/lib/assetUsd.ts` + `ui-v3/src/lib/stxPrice.ts`: removed Charisma-first browser call and added resilient STX spot fetch fallbacks to reduce CORS/payment/429 noise in local dev price loading.

## 2026-04-25 16:10 — Conclusive unlock fallback for recovered locks

- Added `resolveUnknownUnlockTimeForLock(...)` in `ui-v3/src/lib/btcLockRecovery.ts`: a single-lock click-time resolver that brute-forces unlock time for one candidate row, patches `unlockUnixSec` + script fields, and returns an updated lock immediately. This avoids waiting on background queues.
- Updated `ui-v3/src/pages/Locks.tsx` unlock flow: when a row has unknown unlock time (`unlockUnixSec <= 500_000_000`), clicking unlock now prompts once for the owner pubkey, force-resolves that row, and continues into normal sweep signing in the same action if resolution succeeds.
- Updated lock row CTA visibility/text for unknown-time candidates: users now get a direct button (`Recover time & unlock`) instead of being blocked until passive recovery finishes.
- Replaced the misleading legacy helper text for unknown-time recovered rows with an action-oriented message that points users to the new force-resolve unlock path.

## 2026-04-25 16:35 — Blank page crash fix (runtime provider wiring + safe address parsing)

- Fixed runtime crash in `ui-v3/src/utils/chain-config.ts`: `inferNetworkFromAddress` and `getClientConfig` now safely handle `undefined`/`null` addresses instead of calling `.trim()` on non-strings.
- Fixed top-level app provider wiring in `ui-v3/src/App.tsx`: wrapped routed app content in `WalletConnectionProvider` so components using `useWalletConnection()` (e.g. landing sections and header) no longer throw "must be used within a WalletConnectionProvider".
- Verified recovery by reloading `http://localhost:8080/`: page renders full landing content again (no blank document).

## 2026-04-25 16:50 — Wallet Selector blank page (`?demo=true`) fix

- Root cause was missing `DemoModeProvider`, not envs: `WalletSelector` calls `useDemoMode()` and crashed with `useDemoMode must be used within a DemoModeProvider` on `/wallet-selector?demo=true`.
- Wrapped app providers in `ui-v3/src/App.tsx` with `DemoModeProvider` under `WalletConnectionProvider`, preserving the existing provider order for wallet + BTC + prices.
- Re-tested `/wallet-selector?demo=true` and confirmed the page renders normally (header, actions, demo notice, empty-wallet state) instead of blank.

## 2026-04-25 17:05 — Demo mode no longer overrides real connected wallets

- Updated `ui-v3/src/pages/WalletSelector.tsx` demo selection logic to compute `effectiveDemoMode` from route intent + real wallet availability instead of blindly trusting `?demo=true`.
- New behavior: demo wallets render only when `demo=true` **and** there are no real smart wallets (deployed/imported) and no BTC vaults to show. If real data exists, the selector always prioritizes and renders real wallets.
- Kept demo notice, totals, and add-wallet dialog flags tied to `effectiveDemoMode`, so UI state stays consistent with what’s actually rendered.

## 2026-04-25 17:30 — Unlock reliability + demo-service precedence fixes

- `ui-v3/src/lib/btcLockSpend.ts`: added unlock preflight guard to fail early with a clear message when `unlockUnixSec` is still in the future, and aligned transaction `nLockTime` to the lock script timestamp (`lock.unlockUnixSec`) to avoid mempool `non-final` rejections caused by wall-clock locktime skew.
- `ui-v3/src/services/bitcoinTxService.ts`: added fee-estimate fallback to Blockstream (`/fee-estimates`) when mempool.space fee endpoint returns non-200 (e.g. 503). This keeps unlock/build flow alive during mempool API outages.
- `ui-v3/src/hooks/useSmartWalletContractService.ts` and `ui-v3/src/hooks/useAccountBalanceService.tsx`: fixed `useDemoMode` consumption (`{ isDemoMode }`) and introduced `useDemoServices` gating so demo mocks are only used for demo addresses (or no address), never for connected real wallet addresses. This prevents demo data from overriding deployed-wallet fetches for real accounts.

## 2026-04-25 18:00 — Vault uniqueness + history + lock fee behavior follow-ups

- `ui-v3/src/lib/btcVaultStorage.ts` + `ui-v3/src/pages/CreateBtcVault.tsx`: hardened solo-vault nonce commitment generation/length (up to 64 hex chars with timestamp+random fallback) so repeated solo vault creations for the same owner cannot collapse to the same derived P2WSH address.
- `ui-v3/src/services/transactionDataService.ts`: removed the over-restrictive `token_transfer` filter in `fetchTransactionsFromAPI`, so contract-call and other relevant Stacks tx rows are no longer dropped, fixing empty history lists for many wallets.
- `ui-v3/src/lib/platformFee.ts`: added `PlatformFeeOptions` with `enforceMinFloor` to allow proportional-fee mode.
- `ui-v3/src/pages/Locks.tsx` and `ui-v3/src/lib/btcLockSpend.ts`: switched lock-fee quotes to `enforceMinFloor: false` so lock platform fee follows configured bps directly instead of being pinned by a min-sats floor (e.g., ~546 sats).
- `ui-v3/src/pages/Dashboard.tsx`: included active locked BTC value in aggregate portfolio USD total in addition to the dedicated “Locked BTC” card.

## 2026-04-25 18:20 — Create-lock wallet black-screen mitigation

- `ui-v3/src/pages/Locks.tsx`: changed create-lock broadcast payload to a single BTC recipient (the lock address) to avoid wallet modal black-screen failures seen with multi-recipient `sendTransfer` requests on some providers.
- Updated create-lock UX copy and totals to match behavior: platform fee remains shown as policy info but is collected on unlock/sweep flow, not in the initial lock-funding request.
- Preserved proportional fee behavior (`enforceMinFloor: false`) for lock flows and kept unlock-side fee charging intact.

## 2026-04-25 18:05 — Transaction history + vault derivation hardening

- `ui-v3/src/services/transactionDataService.ts`: removed static API client binding and now derives the Stacks API base URL per-wallet-address on each request (`clientForAddress(address)`), fixing empty history results from network mismatch (testnet/mainnet principal queried against wrong API host).
- Added null-safe principal handling in transaction post-condition parsing to avoid runtime failures when post-conditions are absent.
- `ui-v3/src/lib/btcScript.ts` + `ui-v3/src/lib/btcVaultStorage.ts` + `ui-v3/src/pages/CreateBtcVault.tsx`: added nonce commitment support for solo vault derivation so multiple solo vaults from the same owner key can deterministically produce unique deposit addresses.
- `ui-v3/src/pages/Dashboard.tsx`: added a new "Locked BTC" stat card that sums active (unswept) BTC lock amounts from local lock storage.
- `ui-v3/src/lib/platformFee.ts`: default minimum sats floor is now `0` so 10 bps remains proportional unless explicitly configured via env floor.

## 2026-04-25 18:20 — Vault uniqueness, STX history fetch stability, dashboard locked BTC

- `ui-v3/src/lib/btcScript.ts` + `ui-v3/src/lib/btcVaultStorage.ts` + `ui-v3/src/pages/CreateBtcVault.tsx`: solo vault derivation now supports a per-vault nonce commitment embedded in the witness script (`<nonce> DROP <pubkey> CHECKSIG`) so creating multiple solo vaults from the same wallet yields different addresses. The nonce is derived from the vault id and persisted on the record.
- `ui-v3/src/services/transactionDataService.ts`: fixed network-client selection to be per-address (instead of one client initialized without wallet context), and hardened post-condition sender extraction against missing post conditions. This removes a silent empty-array failure path in Stacks history processing.
- `ui-v3/src/pages/Dashboard.tsx`: added a `Locked BTC` stat card showing total active lock principal (all non-spent funded BTC locks from local lock records) and wired live updates from lock storage change events.
- `ui-v3/src/lib/platformFee.ts`: changed default minimum BTC platform fee floor from `546` sats to `0` sats so lock fees can follow proportional bps behavior on small amounts by default.

## 2026-04-25 15:45 - Merge conflict recovery for btc-locks-vaults vs upstream/dev

- Resolved all Git unmerged paths by preserving the `btc-locks-vaults` branch versions for conflicted files and retaining non-conflicting upstream additions already present in the merge index. This removed all `UU/UD` conflict states and restored a clean working tree.
- Fixed post-merge regressions: removed stale `ui/sonner` import from `src/App.tsx`, added missing dependencies (`@stacks/blockchain-api-client`, `@stacks/common`) to `ui-v3/package.json`/lockfile, and added a backward-compatible `useUserWalletConnection` export in `src/hooks/useWalletConnection.ts` so newer unified-header consumers still compile.
