/**
 * Self-healing migration for legacy `BtcLockRecord`s.
 *
 * Some older locks stored in localStorage are missing one or more of:
 *   - `ownerPubkey`
 *   - `witnessScriptHex`
 *   - `scriptPubkeyHex`
 *
 * Without those fields, `lockCanSpendOnChain()` returns false and the unlock button
 * is disabled — even though the funds are perfectly sweepable on-chain.
 *
 * **The fix is deterministic and safe**: given the owner's compressed pubkey and the
 * `unlockUnixSec`, `deriveCltvP2wshLock()` reproduces the exact same P2WSH address.
 * If the freshly-derived address matches the one we stored at creation time, we know
 * this is a real script-based lock and we can backfill the missing script fields and
 * sweep it normally.
 *
 * Priority order for resolving the pubkey:
 *   1. Already on the record (`ownerPubkey`).
 *   2. Fresh `resolveOwnerPubkey(walletData, address)` (wallet RPC / session cache).
 *   3. Mempool history — pull the pubkey from a past `scriptsig`/`witness` push at
 *      the owner's own address (`fetchPubkeyForAddress`). Works for any address type
 *      that has at least one prior outgoing tx.
 *
 * If all three fail, or the derived address doesn't match what was stored, we leave
 * the record alone and surface a clear error to the UI.
 */

import { hex } from "@scure/base";
import {
  deriveCltvP2wshLock,
  btcNetworkFromAddress,
  parsePubkey,
} from "@/lib/btcScript";
import {
  lockCanSpendOnChain,
  updateBtcLock,
  type BtcLockRecord,
} from "@/lib/btcLockStorage";
import { resolveOwnerPubkey } from "@/lib/btcOwnerPubkey";
import { fetchPubkeyForAddress } from "@/services/btcMempoolService";
import type { WalletSessionData } from "@/lib/walletSession";

export type HealResult =
  | { ok: true; lock: BtcLockRecord; healed: boolean }
  | { ok: false; reason: string };

function pubkeyFromSession(
  session: WalletSessionData | null,
  address: string
): string | null {
  if (!session) return null;
  const candidates = [
    session.preferredBtc,
    session.taprootBtc,
    ...session.addresses.btc,
  ].filter(Boolean);
  const hit = candidates.find((a) => a && a.address === address && a.publicKey);
  return hit?.publicKey ? hit.publicKey.toLowerCase().replace(/^0x/, "") : null;
}

async function findOwnerPubkeyHex(
  lock: BtcLockRecord,
  session: WalletSessionData | null,
  opts: { allowWalletPrompt: boolean }
): Promise<string | null> {
  // 1. Already on the record.
  if (lock.ownerPubkey && /^(02|03)[0-9a-f]{64}$/i.test(lock.ownerPubkey)) {
    return lock.ownerPubkey.toLowerCase();
  }

  // 2. Cached on the connected session — never prompts the wallet.
  const cached = pubkeyFromSession(session, lock.ownerBtcAddress);
  if (cached) return cached;

  // 3. Mempool: pull the pubkey from a prior spend by the owner address.
  try {
    const fromChain = await fetchPubkeyForAddress(lock.ownerBtcAddress);
    if (fromChain) return fromChain.toLowerCase();
  } catch {
    // ignore
  }

  // 4. Last resort: ask the wallet via getAddresses. Only do this on explicit
  //    user action (e.g. clicking "Recover & sweep") — auto-heal must NEVER
  //    reach here, otherwise opening the page spams a popup per legacy lock.
  if (opts.allowWalletPrompt) {
    try {
      const via = await resolveOwnerPubkey(session, lock.ownerBtcAddress, {
        allowWalletRpc: true,
      });
      if (via.publicKeyHex) {
        return via.publicKeyHex.toLowerCase().replace(/^0x/, "");
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Best-effort backfill of missing script fields on a legacy lock record.
 *
 * - If the lock already has every script field, returns `{ ok: true, healed: false }`.
 * - If it can be re-derived (pubkey + unlockUnixSec → lockAddress match), persists the
 *   backfilled fields via `updateBtcLock` and returns `{ ok: true, healed: true, lock }`.
 * - Otherwise returns `{ ok: false, reason }`.
 */
export async function tryHealLock(
  lock: BtcLockRecord,
  session: WalletSessionData | null,
  opts: { allowWalletPrompt?: boolean } = {}
): Promise<HealResult> {
  if (lockCanSpendOnChain(lock)) {
    return { ok: true, lock, healed: false };
  }

  // Records produced by chain-side recovery without a resolved unlock time use
  // `unlockUnixSec = 0` as a sentinel. Trying to derive a script from that throws
  // out of `buildCltvWitnessScript`. Bail early with a clear, user-facing message —
  // the background brute-force in `btcLockRecovery` is what fills this in.
  if (!Number.isFinite(lock.unlockUnixSec) || lock.unlockUnixSec <= 500_000_000) {
    return {
      ok: false,
      reason:
        "We're still searching the chain for this lock's unlock time. Hang on a moment and try again.",
    };
  }

  const pubkeyHex = await findOwnerPubkeyHex(lock, session, {
    allowWalletPrompt: opts.allowWalletPrompt ?? false,
  });
  if (!pubkeyHex) {
    return {
      ok: false,
      reason:
        "Couldn't resolve the owner's Bitcoin public key. Reconnect the wallet that created this lock and try again — we'll pick it up automatically.",
    };
  }

  let ownerPubkey: Uint8Array;
  try {
    ownerPubkey = parsePubkey(pubkeyHex);
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "Resolved pubkey wasn't a valid compressed secp256k1 key.",
    };
  }

  const network = btcNetworkFromAddress(lock.ownerBtcAddress);
  const derived = deriveCltvP2wshLock(ownerPubkey, lock.unlockUnixSec, network);

  if (derived.address !== lock.lockAddress) {
    return {
      ok: false,
      reason:
        "This looks like a legacy preview lock — the stored lock address doesn't match a real CLTV P2WSH script for this wallet + unlock time. Nothing is lost; there was no on-chain UTXO to sweep in the first place.",
    };
  }

  const patch: Partial<BtcLockRecord> = {
    ownerPubkey: hex.encode(ownerPubkey),
    witnessScriptHex: derived.witnessScriptHex,
    scriptPubkeyHex: derived.scriptPubkeyHex,
  };
  updateBtcLock(lock.id, patch);

  return {
    ok: true,
    lock: { ...lock, ...patch },
    healed: true,
  };
}
