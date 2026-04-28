import { deriveCltvP2wshLock, btcNetworkFromAddress, parsePubkey } from "@/lib/btcScript";

const STORAGE_KEY = "csw_btc_locks_v1";
const USER_SCOPE_KEY = "csw_user_scope_key";

export const BTC_LOCKS_CHANGED_EVENT = "csw-btc-locks-changed";

export type BtcLockStatus = "pending" | "broadcast" | "confirmed" | "unlockable" | "spent";

/**
 * `BtcLockRecord` describes a CLTV P2WSH lock created by this app.
 *
 * Legacy rows (created before the real-script release) may be missing `witnessScriptHex` /
 * `ownerPubkey`. `loadBtcLocks` returns them but the UI surfaces them as "legacy — soft lock"
 * so it's obvious the on-chain policy is not enforced.
 */
export type BtcLockRecord = {
  id: string;
  /** Optional vault id when this lock was funded from a vault. */
  sourceVaultId?: string;
  ownerBtcAddress: string;
  /** 33-byte compressed secp256k1 pubkey (hex) used in the CLTV script. */
  ownerPubkey?: string;
  /** P2WSH address funds are sent to — enforced by a BIP-65 time-lock. */
  lockAddress: string;
  /** Hex-encoded witness script. Required to spend the lock once unlocked. */
  witnessScriptHex?: string;
  /** Hex-encoded scriptPubKey (`OP_0 <sha256(witnessScript)>`). */
  scriptPubkeyHex?: string;
  amountSats: number;
  amountBtc: string;
  unlockUnixSec: number;
  createdAt: string;
  /**
   * Unix seconds of the first confirmation of the funding tx. Filled by the polling job once
   * the tx is mined. This is the authoritative "locked at" time — the local `createdAt` only
   * records when the UI was clicked, not when the lock became real.
   */
  fundedAtUnixSec?: number;
  txid: string | null;
  /** The output index of the funding tx used by the P2WSH output. Filled by the polling job. */
  vout?: number;
  status: BtcLockStatus;
  note?: string;
  /** Set once the lock has been swept/spent (after unlock). */
  spendTxid?: string;
  /** Number of full unlock-time recovery passes attempted for unknown-time rows. */
  unknownUnlockResolveAttempts?: number;
  /** True when exhaustive recovery attempts concluded this is not a CSW lock script. */
  unknownUnlockUnrecoverable?: boolean;
};

function parseList(raw: string | null): BtcLockRecord[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(isBtcLockRecord);
  } catch {
    return [];
  }
}

function isBtcLockRecord(x: unknown): x is BtcLockRecord {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    (r.sourceVaultId === undefined || typeof r.sourceVaultId === "string") &&
    typeof r.ownerBtcAddress === "string" &&
    typeof r.lockAddress === "string" &&
    (r.ownerPubkey === undefined || typeof r.ownerPubkey === "string") &&
    (r.witnessScriptHex === undefined || typeof r.witnessScriptHex === "string") &&
    (r.scriptPubkeyHex === undefined || typeof r.scriptPubkeyHex === "string") &&
    typeof r.amountSats === "number" &&
    typeof r.amountBtc === "string" &&
    typeof r.unlockUnixSec === "number" &&
    typeof r.createdAt === "string" &&
    (r.txid === null || typeof r.txid === "string") &&
    (r.vout === undefined || typeof r.vout === "number") &&
    (r.fundedAtUnixSec === undefined || typeof r.fundedAtUnixSec === "number") &&
    (r.unknownUnlockResolveAttempts === undefined || typeof r.unknownUnlockResolveAttempts === "number") &&
    (r.unknownUnlockUnrecoverable === undefined || typeof r.unknownUnlockUnrecoverable === "boolean") &&
    typeof r.status === "string" &&
    (r.spendTxid === undefined || typeof r.spendTxid === "string")
  );
}

export function loadBtcLocks(): BtcLockRecord[] {
  if (typeof localStorage === "undefined") return [];
  const scopedKey = getScopedStorageKey();
  if (scopedKey) {
    const scopedRaw = localStorage.getItem(scopedKey);
    if (scopedRaw != null) {
      return parseList(scopedRaw);
    }
    const legacy = parseList(localStorage.getItem(STORAGE_KEY));
    if (legacy.length > 0) {
      localStorage.setItem(scopedKey, JSON.stringify(legacy));
      return legacy;
    }
    localStorage.setItem(scopedKey, "[]");
    return [];
  }
  return parseList(localStorage.getItem(STORAGE_KEY));
}

function saveAll(locks: BtcLockRecord[]) {
  const scopedKey = getScopedStorageKey();
  localStorage.setItem(scopedKey ?? STORAGE_KEY, JSON.stringify(locks));
}

function getScopedStorageKey(): string | null {
  if (typeof localStorage === "undefined") return null;
  const scope = localStorage.getItem(USER_SCOPE_KEY)?.trim().toLowerCase();
  if (!scope) return null;
  return `${STORAGE_KEY}::${scope}`;
}

export function notifyBtcLocksChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BTC_LOCKS_CHANGED_EVENT));
  }
}

export type CreateBtcLockInput = {
  id: string;
  sourceVaultId?: string;
  ownerBtcAddress: string;
  /** Compressed secp256k1 pubkey (hex) from `getAddresses`. Required to enforce the lock on-chain. */
  ownerPubkeyHex: string;
  amountSats: number;
  amountBtc: string;
  unlockUnixSec: number;
  note?: string;
};

export function createBtcLockRecord(input: CreateBtcLockInput): BtcLockRecord {
  const ownerPubkey = parsePubkey(input.ownerPubkeyHex);
  const network = btcNetworkFromAddress(input.ownerBtcAddress);
  const derived = deriveCltvP2wshLock(ownerPubkey, input.unlockUnixSec, network);
  const record: BtcLockRecord = {
    id: input.id,
    sourceVaultId: input.sourceVaultId,
    ownerBtcAddress: input.ownerBtcAddress,
    ownerPubkey: input.ownerPubkeyHex.toLowerCase().replace(/^0x/, ""),
    lockAddress: derived.address,
    witnessScriptHex: derived.witnessScriptHex,
    scriptPubkeyHex: derived.scriptPubkeyHex,
    amountSats: input.amountSats,
    amountBtc: input.amountBtc,
    unlockUnixSec: input.unlockUnixSec,
    createdAt: new Date().toISOString(),
    txid: null,
    status: "pending",
    note: input.note,
    unknownUnlockResolveAttempts: 0,
    unknownUnlockUnrecoverable: false,
  };
  const next = [...loadBtcLocks(), record];
  saveAll(next);
  notifyBtcLocksChanged();
  return record;
}

export function updateBtcLock(id: string, patch: Partial<BtcLockRecord>) {
  const list = loadBtcLocks();
  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  saveAll(list);
  notifyBtcLocksChanged();
}

/**
 * Insert a fully-formed `BtcLockRecord` (e.g. produced by chain-side recovery).
 * No-op if a record with the same `id` already exists. Returns true if a row
 * was inserted, false otherwise.
 */
export function upsertBtcLock(record: BtcLockRecord): boolean {
  if (!isBtcLockRecord(record)) return false;
  const list = loadBtcLocks();
  const idx = list.findIndex((l) => l.id === record.id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...record };
    saveAll(list);
    notifyBtcLocksChanged();
    return false;
  }
  list.push(record);
  saveAll(list);
  notifyBtcLocksChanged();
  return true;
}

export function removeBtcLock(id: string) {
  const next = loadBtcLocks().filter((l) => l.id !== id);
  saveAll(next);
  notifyBtcLocksChanged();
}

/** True when a record has the fields needed for an on-chain unlock (CLTV spend). */
export function lockCanSpendOnChain(lock: BtcLockRecord): boolean {
  return Boolean(lock.witnessScriptHex && lock.scriptPubkeyHex && lock.ownerPubkey);
}
