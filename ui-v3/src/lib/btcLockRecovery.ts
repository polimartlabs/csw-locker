/**
 * Best-effort, on-chain fallback for `BtcLockRecord`s when localStorage was wiped or
 * the user is on a different browser / device.
 *
 * Strategy
 * --------
 * The CLTV-P2WSH locks this app creates have a very specific shape:
 *
 *   witnessScript = `<unlockUnixSec> CLTV DROP <ownerPubkey> CHECKSIG`
 *   address       = bech32(P2WSH(sha256(witnessScript)))
 *
 * Because the script is hidden behind a P2WSH commitment, the network only learns
 * the witness script when the lock is **spent**. So recovery splits in two paths:
 *
 *   1. **Spent-lock recovery** — for any tx in the owner's history whose `vin` reveals
 *      a CLTV-shaped witness script, we can fully reconstruct the original lock
 *      (`unlockUnixSec`, `ownerPubkey`, `lockAddress`, funding `txid` + `vout`,
 *      sweep `txid`). These come back with `status: "spent"` and are immediately
 *      complete.
 *
 *   2. **Unspent-lock recovery** — for any vout where the owner sent funds to a
 *      P2WSH address, we know the **address** and **amount** but not the unlock
 *      time. We brute-force `unlockUnixSec` over a bounded, minute-aligned time
 *      window: for every candidate `t` we re-derive the address from
 *      `(ownerPubkey, t)` and compare. The picker enforces minute resolution and
 *      seconds=0, so the search space at minute granularity for the
 *      `[fundedAt - 1h, fundedAt + 5y]` window is ~2.6 M candidates. We trim that
 *      to a coarser tier-by-tier search (minute for the first 60 days, hour for
 *      the rest) and bail early on first match. On modern hardware this is a
 *      sub-second background task per address.
 *
 * If neither path resolves a lock, we still surface the funding tx as a
 * "candidate" entry so the user knows funds exist on-chain — and can investigate
 * via the explorer.
 */

import { hex } from "@scure/base";
import { Script, ScriptNum } from "@scure/btc-signer";
import {
  deriveCltvP2wshLock,
  btcNetworkFromAddress,
  parsePubkey,
} from "@/lib/btcScript";
import {
  getAddressTxs,
  getTxFull,
  type MempoolBtcTxFull,
  type MempoolBtcVout,
} from "@/services/btcMempoolService";
import {
  loadBtcLocks,
  updateBtcLock,
  upsertBtcLock,
  notifyBtcLocksChanged,
  type BtcLockRecord,
} from "@/lib/btcLockStorage";
import { networkLabelFromAddress } from "@/lib/btcScript";
import { getClientConfig } from "@/utils/chain-config";

type CltvScript = {
  unlockUnixSec: number;
  ownerPubkeyHex: string;
};

/**
 * Decode a witness script and return CLTV parameters if it matches our exact shape.
 * Anything else (taproot leaves, multisig, custom scripts) returns null.
 */
export function parseCltvWitnessScript(scriptHex: string): CltvScript | null {
  let parts: ReturnType<typeof Script.decode>;
  try {
    parts = Script.decode(hex.decode(scriptHex.toLowerCase().replace(/^0x/, "")));
  } catch {
    return null;
  }
  if (parts.length !== 5) return null;
  const [num, op1, op2, pk, op3] = parts;
  if (
    !(num instanceof Uint8Array) ||
    op1 !== "CHECKLOCKTIMEVERIFY" ||
    op2 !== "DROP" ||
    !(pk instanceof Uint8Array) ||
    op3 !== "CHECKSIG"
  ) {
    return null;
  }
  if (pk.length !== 33 || (pk[0] !== 0x02 && pk[0] !== 0x03)) return null;
  let unlock: bigint;
  try {
    unlock = ScriptNum().decode(num);
  } catch {
    return null;
  }
  // Sanity: BIP-65 timestamp range and not absurdly far out.
  const n = Number(unlock);
  if (!Number.isFinite(n) || n < 500_000_000 || n > 4_000_000_000) return null;
  return { unlockUnixSec: n, ownerPubkeyHex: hex.encode(pk).toLowerCase() };
}

/**
 * Brute-force find the `unlockUnixSec` that produces `lockAddress` from the given
 * owner pubkey, by sweeping minute-aligned timestamps in `[from, to)`.
 *
 * Stops on first match. Yields to the event loop every `chunkSize` iterations so
 * the UI thread stays responsive.
 */
async function bruteForceUnlockTime(opts: {
  lockAddress: string;
  ownerPubkey: Uint8Array;
  network: ReturnType<typeof btcNetworkFromAddress>;
  fromUnixSec: number;
  toUnixSec: number;
  stepSec: number;
  chunkSize?: number;
}): Promise<number | null> {
  const { lockAddress, ownerPubkey, network, fromUnixSec, toUnixSec, stepSec } = opts;
  const chunkSize = opts.chunkSize ?? 4096;
  const start = Math.max(500_000_001, Math.floor(fromUnixSec / stepSec) * stepSec);
  const end = Math.floor(toUnixSec / stepSec) * stepSec;
  let i = 0;
  for (let t = start; t <= end; t += stepSec) {
    try {
      const derived = deriveCltvP2wshLock(ownerPubkey, t, network);
      if (derived.address === lockAddress) return t;
    } catch {
      // Skip invalid candidates (e.g. boundary cases) — we want overall robustness.
    }
    if (++i % chunkSize === 0) {
      // Yield so the page stays interactive during a longer scan.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return null;
}

/**
 * Try to recover the unlock time for a P2WSH address that the owner funded but
 * for which we have no local record.
 *
 * Tiered search, fastest first — most user-created locks unlock within hours or
 * days of funding, so we frontload the small windows that resolve in well under
 * a second on a modern laptop:
 *
 *   1. Minute resolution, `[fundedAt - 1h, fundedAt + 48h]` (~3 K candidates).
 *      Catches every "test lock" and the vast majority of real ones.
 *   2. Minute resolution, `[fundedAt + 48h, fundedAt + 60d]`  (~84 K candidates).
 *   3. Hour resolution out to 5 years (~44 K candidates).
 *   4. Day resolution out to 20 years (~5.5 K candidates).
 *
 * Bails at the first hit; returns null if nothing matches in any tier.
 */
async function recoverUnlockTimeForAddress(
  lockAddress: string,
  ownerPubkey: Uint8Array,
  network: ReturnType<typeof btcNetworkFromAddress>,
  fundedAtUnixSec: number
): Promise<number | null> {
  const tiers: Array<{ from: number; to: number; step: number }> = [
    {
      from: fundedAtUnixSec - 60 * 60,
      to: fundedAtUnixSec + 48 * 60 * 60,
      step: 60,
    },
    {
      from: fundedAtUnixSec + 48 * 60 * 60,
      to: fundedAtUnixSec + 60 * 24 * 60 * 60,
      step: 60,
    },
    {
      from: fundedAtUnixSec + 60 * 24 * 60 * 60,
      to: fundedAtUnixSec + 5 * 365 * 24 * 60 * 60,
      step: 60 * 60,
    },
    {
      from: fundedAtUnixSec + 5 * 365 * 24 * 60 * 60,
      to: fundedAtUnixSec + 20 * 365 * 24 * 60 * 60,
      step: 24 * 60 * 60,
    },
  ];
  for (const t of tiers) {
    const hit = await bruteForceUnlockTime({
      lockAddress,
      ownerPubkey,
      network,
      fromUnixSec: t.from,
      toUnixSec: t.to,
      stepSec: t.step,
    });
    if (hit != null) return hit;
  }
  return null;
}

export type RecoveryResult = {
  /** Full, immediately-usable records (script + unlock time + ownerPubkey known). */
  recovered: BtcLockRecord[];
  /**
   * Candidates: confirmed P2WSH outputs the owner funded but whose `unlockUnixSec`
   * we couldn't determine. Stored without script fields so the UI clearly marks
   * them "address-only" — they're still useful (funds visible on-chain).
   */
  candidates: BtcLockRecord[];
  /** Diagnostic counters for the UI to surface. */
  scannedTxs: number;
};

function makeRecoveryId(prefix: string, fundingTxid: string, vout: number): string {
  return `csw-recovered-${prefix}-${fundingTxid}-${vout}`;
}

function btcStringFromSats(sats: number): string {
  const s = (sats / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  return s.length ? s : "0";
}

/**
 * Recover BTC locks for the given owner address by scanning recent transactions.
 *
 * - `ownerPubkeyHex` is required to brute-force unspent locks. If absent, we still
 *   recover *spent* locks (their witness reveals the pubkey) and surface raw P2WSH
 *   candidates without unlock times.
 * - `existingLocks` is the current localStorage list — we skip funding outpoints
 *   that already have a record so recovery is idempotent.
 * - `maxTxs` caps how many recent txs we scan from the address.
 */
export async function recoverLocksFromChain(opts: {
  ownerAddress: string;
  ownerPubkeyHex?: string;
  existingLocks?: BtcLockRecord[];
  maxTxs?: number;
}): Promise<RecoveryResult> {
  const { ownerAddress, ownerPubkeyHex } = opts;
  const existing = opts.existingLocks ?? loadBtcLocks();
  const maxTxs = opts.maxTxs ?? 50;

  const network = btcNetworkFromAddress(ownerAddress);
  const networkLabel = networkLabelFromAddress(ownerAddress);

  let ownerPubkey: Uint8Array | null = null;
  if (ownerPubkeyHex) {
    try {
      ownerPubkey = parsePubkey(ownerPubkeyHex);
    } catch {
      ownerPubkey = null;
    }
  }

  // Index existing locks by funding outpoint AND by lock address so we don't
  // duplicate. localStorage may have an entry pre-funding (txid=null) too — that's
  // matched by `lockAddress` only.
  const knownByOutpoint = new Set<string>();
  const knownByLockAddress = new Map<string, BtcLockRecord>();
  for (const l of existing) {
    if (l.txid && l.vout != null) knownByOutpoint.add(`${l.txid}:${l.vout}`);
    knownByLockAddress.set(l.lockAddress, l);
  }

  const list = await getAddressTxs(ownerAddress);
  const scoped = list.slice(0, maxTxs);

  const recovered: BtcLockRecord[] = [];
  const candidates: BtcLockRecord[] = [];
  /**
   * Track addresses we've already enqueued for brute-force this run. If multiple
   * txs fund the same lockAddress (rare — a top-up scenario) we still only run
   * the brute-force once.
   */
  const queuedForBrute = new Set<string>();

  // Fetch full tx data in parallel (mempool.space tolerates this fine for ≤50 txs).
  const fulls = await Promise.all(scoped.map((t) => getTxFull(t.txid, networkLabel)));

  for (const tx of fulls) {
    if (!tx) continue;

    // ---- Path 1: spent-lock recovery via vin witness inspection ------------
    for (const vin of tx.vin) {
      if (vin.is_coinbase) continue;
      // P2WSH witness layout for our CLTV spend is exactly [signature, witnessScript].
      const w = vin.witness;
      if (!Array.isArray(w) || w.length !== 2) continue;
      const cltv = parseCltvWitnessScript(w[1]);
      if (!cltv) continue;

      // Confirm the prevout is on a P2WSH that matches a CLTV derivation of the
      // revealed pubkey. This rules out collisions with unrelated CLTV scripts.
      let pk: Uint8Array;
      try {
        pk = parsePubkey(cltv.ownerPubkeyHex);
      } catch {
        continue;
      }
      const derived = deriveCltvP2wshLock(pk, cltv.unlockUnixSec, network);
      const fundingAddress = vin.prevout?.scriptpubkey_address;
      if (fundingAddress && derived.address !== fundingAddress) continue;

      const outpointKey = `${vin.txid}:${vin.vout}`;
      const fundingValue = vin.prevout?.value ?? 0;

      if (knownByOutpoint.has(outpointKey)) {
        // We already know this lock — patch in the spend info so the UI can mark
        // it swept even if the local poller hadn't caught up yet.
        const known = existing.find((l) => l.txid === vin.txid && l.vout === vin.vout);
        if (known && known.status !== "spent") {
          updateBtcLock(known.id, { status: "spent", spendTxid: tx.txid });
        }
        continue;
      }

      // Net-new spent-lock record.
      const fundedAt = tx.status?.block_time ?? Math.floor(Date.now() / 1000);
      recovered.push({
        id: makeRecoveryId("cltv", vin.txid, vin.vout),
        ownerBtcAddress: ownerAddress,
        ownerPubkey: cltv.ownerPubkeyHex,
        lockAddress: derived.address,
        witnessScriptHex: derived.witnessScriptHex,
        scriptPubkeyHex: derived.scriptPubkeyHex,
        amountSats: fundingValue,
        amountBtc: btcStringFromSats(fundingValue),
        unlockUnixSec: cltv.unlockUnixSec,
        createdAt: new Date((fundedAt - 1) * 1000).toISOString(),
        fundedAtUnixSec: fundedAt,
        txid: vin.txid,
        vout: vin.vout,
        status: "spent",
        spendTxid: tx.txid,
        note: "Recovered from chain (spent)",
      });
      knownByOutpoint.add(outpointKey);
    }

    // ---- Path 2: unspent-lock candidates from owner-funded P2WSH outputs ----
    // Only consider txs the owner authored (i.e. one of the vins is owned by them).
    const ownerFunded = tx.vin.some(
      (v) => v.prevout?.scriptpubkey_address === ownerAddress
    );
    if (!ownerFunded) continue;

    tx.vout.forEach((vo: MempoolBtcVout, idx: number) => {
      if (vo.scriptpubkey_type !== "v0_p2wsh") return;
      if (!vo.scriptpubkey_address) return;
      const outpointKey = `${tx.txid}:${idx}`;
      if (knownByOutpoint.has(outpointKey)) return;
      // If we already know a localStorage record for this address (e.g. status =
      // "pending" with txid=null) and the record is missing txid/vout, just patch
      // it instead of producing a duplicate candidate.
      const existingForAddr = knownByLockAddress.get(vo.scriptpubkey_address);
      if (existingForAddr && (!existingForAddr.txid || existingForAddr.vout == null)) {
        updateBtcLock(existingForAddr.id, {
          txid: tx.txid,
          vout: idx,
          fundedAtUnixSec: tx.status?.block_time,
          status: tx.status?.confirmed ? "confirmed" : "broadcast",
        });
        knownByOutpoint.add(outpointKey);
        return;
      }
      if (existingForAddr) {
        knownByOutpoint.add(outpointKey);
        return;
      }

      const fundedAt = tx.status?.block_time ?? Math.floor(Date.now() / 1000);
      const sats = vo.value ?? 0;
      candidates.push({
        id: makeRecoveryId("p2wsh", tx.txid, idx),
        ownerBtcAddress: ownerAddress,
        ownerPubkey: ownerPubkeyHex?.toLowerCase().replace(/^0x/, ""),
        lockAddress: vo.scriptpubkey_address,
        amountSats: sats,
        amountBtc: btcStringFromSats(sats),
        unlockUnixSec: 0, // unknown — the UI must check `witnessScriptHex` to decide unlockability
        createdAt: new Date((fundedAt - 1) * 1000).toISOString(),
        fundedAtUnixSec: fundedAt,
        txid: tx.txid,
        vout: idx,
        status: tx.status?.confirmed ? "confirmed" : "broadcast",
        note: "Recovered from chain — unlock time unknown",
        unknownUnlockResolveAttempts: 0,
        unknownUnlockUnrecoverable: false,
      });
      queuedForBrute.add(`${vo.scriptpubkey_address}:${tx.txid}:${idx}`);
      knownByOutpoint.add(outpointKey);
    });
  }

  // Brute-force unlock times for candidates in the background (don't block).
  // This mutates the candidates in-place and pushes them into recovered when a
  // match is found. We do it sequentially to avoid pegging the CPU for users with
  // lots of P2WSH outputs.
  if (ownerPubkey && candidates.length > 0) {
    void (async () => {
      for (const c of candidates) {
        const found = await recoverUnlockTimeForAddress(
          c.lockAddress,
          ownerPubkey!,
          network,
          c.fundedAtUnixSec ?? Math.floor(Date.now() / 1000)
        );
        if (found != null) {
          const derived = deriveCltvP2wshLock(ownerPubkey!, found, network);
          // Patch the localStorage entry produced from this candidate (if it was
          // persisted by the caller) with the resolved script details.
          const persisted = loadBtcLocks().find((l) => l.id === c.id);
          if (persisted) {
            updateBtcLock(c.id, {
              unlockUnixSec: found,
              witnessScriptHex: derived.witnessScriptHex,
              scriptPubkeyHex: derived.scriptPubkeyHex,
              note: "Recovered from chain",
              unknownUnlockResolveAttempts: 0,
              unknownUnlockUnrecoverable: false,
            });
          }
        } else {
          const persisted = loadBtcLocks().find((l) => l.id === c.id);
          if (persisted) {
            const attempts = (persisted.unknownUnlockResolveAttempts ?? 0) + 1;
            const unrecoverable = attempts >= 3;
            updateBtcLock(c.id, {
              unknownUnlockResolveAttempts: attempts,
              unknownUnlockUnrecoverable: unrecoverable,
              note: unrecoverable
                ? "Not a CSW lock script"
                : persisted.note ?? "Recovered from chain — unlock time unknown",
            });
          }
          notifyBtcLocksChanged();
        }
      }
    })();
  }

  return {
    recovered,
    candidates,
    scannedTxs: scoped.length,
  };
}

/**
 * Convenience helper: run recovery and merge new entries into localStorage.
 *
 * Returns the list of records that were newly added (so the caller can toast
 * "Recovered N locks from on-chain history"). The list returned does not include
 * candidates whose unlock time is later patched in by the background brute-force —
 * for those the storage event fires when the patch lands.
 */
export async function recoverAndPersistLocks(opts: {
  ownerAddress: string;
  ownerPubkeyHex?: string;
}): Promise<{ added: BtcLockRecord[]; scannedTxs: number }> {
  const existing = loadBtcLocks();
  const result = await recoverLocksFromChain({
    ownerAddress: opts.ownerAddress,
    ownerPubkeyHex: opts.ownerPubkeyHex,
    existingLocks: existing,
  });

  const added: BtcLockRecord[] = [];
  for (const rec of [...result.recovered, ...result.candidates]) {
    if (upsertBtcLock(rec)) added.push(rec);
  }

  // Always brute-force any persisted lock that's still missing an unlock time —
  // including ones from previous recovery runs that the candidate-only path
  // would otherwise skip on rerun. This is the loop that turns
  // "Unknown — recovering…" rows into sweepable locks.
  if (opts.ownerPubkeyHex) {
    void resolveUnknownUnlockTimes({
      ownerAddress: opts.ownerAddress,
      ownerPubkeyHex: opts.ownerPubkeyHex,
    });
  }

  return { added, scannedTxs: result.scannedTxs };
}

/**
 * Iterate over every persisted lock for `ownerAddress` that still has
 * `unlockUnixSec ≤ 500_000_000` (our sentinel for "unknown") and brute-force
 * the unlock time. On hit, patches the record with the resolved
 * `unlockUnixSec`, `witnessScriptHex`, and `scriptPubkeyHex` so it becomes
 * sweepable. Idempotent and safe to call repeatedly.
 *
 * This MUST be exported because `recoverLocksFromChain` only enqueues
 * brute-force for net-new candidates. After the first run their records are
 * persisted, so on subsequent mounts they would otherwise be skipped — leaving
 * the user staring at "recovering…" forever.
 */
export async function resolveUnknownUnlockTimes(opts: {
  ownerAddress: string;
  ownerPubkeyHex: string;
}): Promise<{ resolved: number }> {
  let ownerPubkey: Uint8Array;
  try {
    ownerPubkey = parsePubkey(opts.ownerPubkeyHex);
  } catch {
    return { resolved: 0 };
  }
  const network = btcNetworkFromAddress(opts.ownerAddress);

  const targets = loadBtcLocks().filter(
    (l) =>
      l.ownerBtcAddress === opts.ownerAddress &&
      (!Number.isFinite(l.unlockUnixSec) || l.unlockUnixSec <= 500_000_000) &&
      l.status !== "spent"
  );
  if (targets.length === 0) return { resolved: 0 };

  let resolved = 0;
  for (const lock of targets) {
    const fundedAt =
      lock.fundedAtUnixSec ??
      Math.floor(new Date(lock.createdAt).getTime() / 1000);
    const found = await recoverUnlockTimeForAddress(
      lock.lockAddress,
      ownerPubkey,
      network,
      Number.isFinite(fundedAt) && fundedAt > 0
        ? fundedAt
        : Math.floor(Date.now() / 1000)
    );
    if (found != null) {
      const derived = deriveCltvP2wshLock(ownerPubkey, found, network);
      updateBtcLock(lock.id, {
        unlockUnixSec: found,
        ownerPubkey: opts.ownerPubkeyHex.toLowerCase().replace(/^0x/, ""),
        witnessScriptHex: derived.witnessScriptHex,
        scriptPubkeyHex: derived.scriptPubkeyHex,
        note: "Recovered from chain",
        unknownUnlockResolveAttempts: 0,
        unknownUnlockUnrecoverable: false,
      });
      resolved += 1;
    } else {
      const attempts = (lock.unknownUnlockResolveAttempts ?? 0) + 1;
      const unrecoverable = attempts >= 3;
      updateBtcLock(lock.id, {
        unknownUnlockResolveAttempts: attempts,
        unknownUnlockUnrecoverable: unrecoverable,
        note: unrecoverable ? "Not a CSW lock script" : lock.note,
      });
    }
  }
  if (resolved > 0) notifyBtcLocksChanged();
  return { resolved };
}

/**
 * Resolve unlock time for one specific lock row.
 *
 * This is the click-time "force resolve" path used from Unlock flow:
 * - no address-history rescan
 * - no background queue
 * - just brute-force this single lock and patch immediately on hit
 */
export async function resolveUnknownUnlockTimeForLock(opts: {
  lock: BtcLockRecord;
  ownerPubkeyHex: string;
}): Promise<{ resolved: boolean; lock?: BtcLockRecord }> {
  const { lock } = opts;
  if (lock.status === "spent") return { resolved: false };
  if (Number.isFinite(lock.unlockUnixSec) && lock.unlockUnixSec > 500_000_000) {
    return { resolved: true, lock };
  }

  let ownerPubkey: Uint8Array;
  try {
    ownerPubkey = parsePubkey(opts.ownerPubkeyHex);
  } catch {
    return { resolved: false };
  }

  const network = btcNetworkFromAddress(lock.ownerBtcAddress);
  const fundedAt =
    lock.fundedAtUnixSec ??
    Math.floor(new Date(lock.createdAt).getTime() / 1000);
  const found = await recoverUnlockTimeForAddress(
    lock.lockAddress,
    ownerPubkey,
    network,
    Number.isFinite(fundedAt) && fundedAt > 0
      ? fundedAt
      : Math.floor(Date.now() / 1000)
  );
  if (found == null) {
    const attempts = (lock.unknownUnlockResolveAttempts ?? 0) + 1;
    const unrecoverable = attempts >= 3;
    updateBtcLock(lock.id, {
      unknownUnlockResolveAttempts: attempts,
      unknownUnlockUnrecoverable: unrecoverable,
      note: unrecoverable ? "Not a CSW lock script" : lock.note,
    });
    notifyBtcLocksChanged();
    return { resolved: false };
  }

  const derived = deriveCltvP2wshLock(ownerPubkey, found, network);
  const patch: Partial<BtcLockRecord> = {
    unlockUnixSec: found,
    ownerPubkey: opts.ownerPubkeyHex.toLowerCase().replace(/^0x/, ""),
    witnessScriptHex: derived.witnessScriptHex,
    scriptPubkeyHex: derived.scriptPubkeyHex,
    note: "Recovered from chain",
    unknownUnlockResolveAttempts: 0,
    unknownUnlockUnrecoverable: false,
  };
  updateBtcLock(lock.id, patch);
  notifyBtcLocksChanged();
  return { resolved: true, lock: { ...lock, ...patch } };
}

// Re-export for convenience in callers that want to display the network badge.
export { getClientConfig };
