import {
  deriveMultisigP2wshVault,
  deriveSoloP2wshVault,
  parsePubkey,
  btcNetworkFromAddress,
  networkLabelFromAddress,
} from "@/lib/btcScript";

const STORAGE_KEY = "csw_btc_vaults_v1";
const USER_SCOPE_KEY = "csw_user_scope_key";
const DELETED_IDS_KEY = "csw_btc_vaults_deleted_ids_v1";

export const BTC_VAULTS_CHANGED_EVENT = "csw-btc-vaults-changed";

/**
 * BTC vault record.
 *
 * A real vault is an **m-of-n P2WSH multisig** whose address is deterministically derived
 * from the sorted (BIP-67) list of compressed signer pubkeys and the threshold `m`.
 *
 * Legacy rows from the preview flow (pre-real-script) keep `derivedVaultAddress` for backward
 * compat and are flagged via the absence of `witnessScriptHex`.
 */
export type BtcVaultKind = "solo" | "multisig";

export type BtcVaultRecord = {
  id: string;
  name: string;
  /** "solo" = single-sig pocket (owner only). "multisig" = m-of-n shared vault. */
  kind?: BtcVaultKind;
  /** On-chain deposit address (P2WSH). For legacy rows this is still the preview string. */
  derivedVaultAddress: string;
  /** Address of the connected wallet when the vault was created (owner pubkey is in signerPubkeys[0]). */
  linkedBtcAddress: string;
  /** Lexicographically sorted (BIP-67) 33-byte compressed pubkeys. For solo vaults this has a single entry. */
  signerPubkeys?: string[];
  /** Optional human labels matching signerPubkeys by index. */
  signerLabels?: string[];
  /** Legacy field (free text). New vaults keep it empty — use signerPubkeys / signerLabels. */
  signerHint: string;
  /** For multisig: minimum signatures to spend. For solo: always "1". */
  threshold: string;
  /** Hex witness script. */
  witnessScriptHex?: string;
  /** Hex scriptPubKey: `OP_0 <sha256(witnessScript)>`. */
  scriptPubkeyHex?: string;
  network?: "mainnet" | "testnet";
  /** Optional per-vault nonce committed in the solo witness script for unique addresses. */
  nonceCommitmentHex?: string;
  /** Optional unlock gate for future policy-based vault flows (unix seconds). */
  unlockUnixSec?: number;
  /** Human policy label (e.g. "standard", "timelock"). */
  policy?: "standard" | "timelock";
  createdAt: string;
};

/** Infer the vault kind for records written before `kind` existed. */
export function getVaultKind(v: BtcVaultRecord): BtcVaultKind {
  if (v.kind === "solo" || v.kind === "multisig") return v.kind;
  return (v.signerPubkeys?.length ?? 0) > 1 ? "multisig" : "solo";
}

function parseList(raw: string | null): BtcVaultRecord[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(isBtcVaultRecord);
  } catch {
    return [];
  }
}

function isBtcVaultRecord(x: unknown): x is BtcVaultRecord {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.name !== "string" ||
    typeof r.derivedVaultAddress !== "string" ||
    typeof r.linkedBtcAddress !== "string" ||
    typeof r.signerHint !== "string" ||
    typeof r.threshold !== "string" ||
    typeof r.createdAt !== "string"
  ) {
    return false;
  }
  if (r.signerPubkeys !== undefined && !(Array.isArray(r.signerPubkeys) && r.signerPubkeys.every((p) => typeof p === "string"))) return false;
  if (r.signerLabels !== undefined && !(Array.isArray(r.signerLabels) && r.signerLabels.every((l) => typeof l === "string"))) return false;
  if (r.witnessScriptHex !== undefined && typeof r.witnessScriptHex !== "string") return false;
  if (r.scriptPubkeyHex !== undefined && typeof r.scriptPubkeyHex !== "string") return false;
  if (r.nonceCommitmentHex !== undefined && typeof r.nonceCommitmentHex !== "string") return false;
  if (r.unlockUnixSec !== undefined && typeof r.unlockUnixSec !== "number") return false;
  if (r.policy !== undefined && r.policy !== "standard" && r.policy !== "timelock") return false;
  if (r.network !== undefined && r.network !== "mainnet" && r.network !== "testnet") return false;
  if (r.kind !== undefined && r.kind !== "solo" && r.kind !== "multisig") return false;
  return true;
}

export function loadBtcVaults(): BtcVaultRecord[] {
  if (typeof localStorage === "undefined") return [];
  const scopedKey = getScopedStorageKey();
  if (scopedKey) {
    const scopedRaw = localStorage.getItem(scopedKey);
    if (scopedRaw != null) {
      const scoped = parseList(scopedRaw);
      return scoped.filter((vault) => !isVaultDeleted(vault.id));
    }
    const legacy = parseList(localStorage.getItem(STORAGE_KEY));
    if (legacy.length > 0) {
      const migrated = legacy.filter((vault) => !isVaultDeleted(vault.id));
      localStorage.setItem(scopedKey, JSON.stringify(migrated));
      return migrated;
    }
    localStorage.setItem(scopedKey, "[]");
    return [];
  }
  return parseList(localStorage.getItem(STORAGE_KEY)).filter((vault) => !isVaultDeleted(vault.id));
}

function saveAll(vaults: BtcVaultRecord[]) {
  const scopedKey = getScopedStorageKey();
  localStorage.setItem(scopedKey ?? STORAGE_KEY, JSON.stringify(vaults));
}

function getScopedStorageKey(): string | null {
  if (typeof localStorage === "undefined") return null;
  const scope = localStorage.getItem(USER_SCOPE_KEY)?.trim().toLowerCase();
  if (!scope) return null;
  return `${STORAGE_KEY}::${scope}`;
}

function getDeletedIdsScopedKey(): string {
  const scoped = getScopedStorageKey();
  if (scoped) return `${DELETED_IDS_KEY}::${scoped}`;
  return DELETED_IDS_KEY;
}

function loadDeletedIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(getDeletedIdsScopedKey());
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function saveDeletedIds(ids: Set<string>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(getDeletedIdsScopedKey(), JSON.stringify([...ids]));
}

function isVaultDeleted(id: string): boolean {
  return loadDeletedIds().has(id);
}

function markVaultDeleted(id: string) {
  const ids = loadDeletedIds();
  ids.add(id);
  saveDeletedIds(ids);
}

function clearVaultDeleted(id: string) {
  const ids = loadDeletedIds();
  if (!ids.delete(id)) return;
  saveDeletedIds(ids);
}

export function notifyBtcVaultsChanged() {
  window.dispatchEvent(new Event(BTC_VAULTS_CHANGED_EVENT));
}

export type CreateBtcVaultInput = {
  id: string;
  name: string;
  linkedBtcAddress: string;
  /** Compressed pubkeys in the order provided by the user. They are sorted (BIP-67) before script derivation. */
  signerPubkeysHex: string[];
  signerLabels?: string[];
  /** m in "m of n". */
  threshold: number;
};

export function createBtcVaultRecord(input: CreateBtcVaultInput): BtcVaultRecord {
  const pubkeys = input.signerPubkeysHex.map((pk) => parsePubkey(pk));
  const network = btcNetworkFromAddress(input.linkedBtcAddress);
  const derived = deriveMultisigP2wshVault(pubkeys, input.threshold, network);
  const record: BtcVaultRecord = {
    id: input.id,
    name: input.name,
    kind: "multisig",
    derivedVaultAddress: derived.address,
    linkedBtcAddress: input.linkedBtcAddress,
    signerPubkeys: derived.sortedPubkeysHex,
    signerLabels: input.signerLabels,
    signerHint: "",
    threshold: String(input.threshold),
    witnessScriptHex: derived.witnessScriptHex,
    scriptPubkeyHex: derived.scriptPubkeyHex,
    network: networkLabelFromAddress(input.linkedBtcAddress),
    createdAt: new Date().toISOString(),
  };
  const next = [...loadBtcVaults(), record];
  clearVaultDeleted(record.id);
  saveAll(next);
  notifyBtcVaultsChanged();
  return record;
}

export type CreateSoloVaultInput = {
  id: string;
  name: string;
  linkedBtcAddress: string;
  /** Compressed pubkey (hex) of the owner — same wallet that connected. */
  ownerPubkeyHex: string;
  ownerLabel?: string;
  nonceCommitmentHex?: string;
  unlockUnixSec?: number;
  policy?: "standard" | "timelock";
};

/**
 * Create a "solo" vault: a named, owner-only P2WSH pocket. Only the connected wallet can
 * sign spends. Useful for segregating funds (e.g. "rent", "savings") without the overhead
 * of multisig coordination.
 */
export function createSoloBtcVaultRecord(input: CreateSoloVaultInput): BtcVaultRecord {
  const ownerPubkey = parsePubkey(input.ownerPubkeyHex);
  const network = btcNetworkFromAddress(input.linkedBtcAddress);
  const nonceSource =
    input.nonceCommitmentHex ??
    `${input.id}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  const cleaned = nonceSource.toLowerCase().replace(/^0x/, "").replace(/[^0-9a-f]/g, "");
  const nonceCommitmentHex = (cleaned.length >= 16 ? cleaned : `${cleaned}${Date.now().toString(16)}`).slice(0, 64);
  const derived = deriveSoloP2wshVault(ownerPubkey, network, nonceCommitmentHex, input.unlockUnixSec);
  const record: BtcVaultRecord = {
    id: input.id,
    name: input.name,
    kind: "solo",
    derivedVaultAddress: derived.address,
    linkedBtcAddress: input.linkedBtcAddress,
    signerPubkeys: [derived.ownerPubkeyHex],
    signerLabels: [input.ownerLabel?.trim() || "You"],
    signerHint: "",
    threshold: "1",
    policy: input.policy ?? "standard",
    unlockUnixSec: input.unlockUnixSec,
    nonceCommitmentHex: derived.nonceCommitmentHex,
    witnessScriptHex: derived.witnessScriptHex,
    scriptPubkeyHex: derived.scriptPubkeyHex,
    network: networkLabelFromAddress(input.linkedBtcAddress),
    createdAt: new Date().toISOString(),
  };
  const next = [...loadBtcVaults(), record];
  clearVaultDeleted(record.id);
  saveAll(next);
  notifyBtcVaultsChanged();
  return record;
}

export function rebuildVaultScript(
  vault: BtcVaultRecord,
  options: { threshold?: number; unlockUnixSec?: number; policy?: "standard" | "timelock" }
): BtcVaultRecord {
  const network = btcNetworkFromAddress(vault.linkedBtcAddress);
  const kind = getVaultKind(vault);
  if (kind === "solo") {
    const ownerHex = vault.signerPubkeys?.[0];
    if (!ownerHex) throw new Error("Owner pubkey missing on vault record.");
    const derived = deriveSoloP2wshVault(
      parsePubkey(ownerHex),
      network,
      vault.nonceCommitmentHex,
      options.policy === "timelock" ? options.unlockUnixSec : undefined
    );
    return {
      ...vault,
      derivedVaultAddress: derived.address,
      witnessScriptHex: derived.witnessScriptHex,
      scriptPubkeyHex: derived.scriptPubkeyHex,
      policy: options.policy ?? "standard",
      unlockUnixSec: options.policy === "timelock" ? options.unlockUnixSec : undefined,
    };
  }
  const signerHex = vault.signerPubkeys ?? [];
  if (signerHex.length === 0) throw new Error("Signer list missing on vault record.");
  const existingThreshold = parseInt(vault.threshold || "1", 10) || 1;
  const requestedThreshold = options.threshold ?? existingThreshold;
  const threshold = Math.max(1, Math.min(requestedThreshold, signerHex.length));
  const derived = deriveMultisigP2wshVault(signerHex.map((pk) => parsePubkey(pk)), threshold, network);
  return {
    ...vault,
    threshold: String(threshold),
    signerPubkeys: derived.sortedPubkeysHex,
    derivedVaultAddress: derived.address,
    witnessScriptHex: derived.witnessScriptHex,
    scriptPubkeyHex: derived.scriptPubkeyHex,
  };
}

/**
 * @deprecated legacy preview-only path. Use `createBtcVaultRecord` so the vault is spendable on-chain.
 */
export function appendBtcVault(input: {
  id: string;
  name: string;
  linkedBtcAddress: string;
  signerHint: string;
  threshold: string;
}): BtcVaultRecord {
  const record: BtcVaultRecord = {
    id: input.id,
    name: input.name,
    derivedVaultAddress: input.linkedBtcAddress,
    linkedBtcAddress: input.linkedBtcAddress,
    signerHint: input.signerHint,
    threshold: input.threshold,
    createdAt: new Date().toISOString(),
  };
  const next = [...loadBtcVaults(), record];
  clearVaultDeleted(record.id);
  saveAll(next);
  notifyBtcVaultsChanged();
  return record;
}

export function removeBtcVault(id: string) {
  markVaultDeleted(id);
  const next = loadBtcVaults().filter((v) => v.id !== id);
  saveAll(next);
  notifyBtcVaultsChanged();
}

export function updateBtcVault(id: string, patch: Partial<BtcVaultRecord>) {
  const next = loadBtcVaults().map((vault) =>
    vault.id === id ? { ...vault, ...patch, id: vault.id } : vault
  );
  saveAll(next);
  notifyBtcVaultsChanged();
}

export function getBtcVault(id: string): BtcVaultRecord | undefined {
  return loadBtcVaults().find((v) => v.id === id);
}

export function vaultIsOnChain(v: BtcVaultRecord): boolean {
  return Boolean(v.witnessScriptHex && v.scriptPubkeyHex && v.signerPubkeys?.length);
}

type SharedVaultPayload = Pick<
  BtcVaultRecord,
  | "id"
  | "name"
  | "kind"
  | "derivedVaultAddress"
  | "linkedBtcAddress"
  | "signerPubkeys"
  | "signerLabels"
  | "threshold"
  | "witnessScriptHex"
  | "scriptPubkeyHex"
  | "network"
>;

export function coordinationFingerprint(vault: Pick<
  BtcVaultRecord,
  "derivedVaultAddress" | "scriptPubkeyHex" | "witnessScriptHex" | "threshold" | "signerPubkeys"
>): string {
  const signerSet = [...(vault.signerPubkeys ?? [])].map((s) => s.toLowerCase()).sort().join(",");
  return [
    (vault.derivedVaultAddress || "").toLowerCase(),
    (vault.scriptPubkeyHex || "").toLowerCase(),
    (vault.witnessScriptHex || "").toLowerCase(),
    String(vault.threshold || "1"),
    signerSet,
  ].join("|");
}

export function exportBtcVaultShareLink(vault: BtcVaultRecord): string {
  const payload: SharedVaultPayload = {
    id: vault.id,
    name: vault.name,
    kind: getVaultKind(vault),
    derivedVaultAddress: vault.derivedVaultAddress,
    linkedBtcAddress: vault.linkedBtcAddress,
    signerPubkeys: vault.signerPubkeys ?? [],
    signerLabels: vault.signerLabels ?? [],
    threshold: vault.threshold,
    witnessScriptHex: vault.witnessScriptHex,
    scriptPubkeyHex: vault.scriptPubkeyHex,
    network: vault.network,
  };
  const encoded = btoa(
    unescape(
      encodeURIComponent(
        JSON.stringify({
          ...payload,
          coordinationFingerprint: coordinationFingerprint(vault),
        })
      )
    )
  );
  return `csw-vault://import/${encoded}`;
}

export function importSharedBtcVault(share: string): BtcVaultRecord {
  const prefix = "csw-vault://import/";
  const encoded = share.trim().startsWith(prefix) ? share.trim().slice(prefix.length) : share.trim();
  let payload: SharedVaultPayload & { coordinationFingerprint?: string };
  try {
    payload = JSON.parse(decodeURIComponent(escape(atob(encoded)))) as SharedVaultPayload;
  } catch {
    throw new Error("Invalid vault share link.");
  }
  if (!payload || !payload.id || !payload.name || !payload.derivedVaultAddress || !payload.linkedBtcAddress) {
    throw new Error("Vault share link is missing required fields.");
  }
  const incomingFingerprint = coordinationFingerprint({
    derivedVaultAddress: payload.derivedVaultAddress,
    scriptPubkeyHex: payload.scriptPubkeyHex,
    witnessScriptHex: payload.witnessScriptHex,
    threshold: payload.threshold ?? "1",
    signerPubkeys: payload.signerPubkeys ?? [],
  });
  if (payload.coordinationFingerprint && payload.coordinationFingerprint !== incomingFingerprint) {
    throw new Error("Vault link integrity check failed. Ask a signer to regenerate the share link.");
  }
  const existing = getBtcVault(payload.id);
  if (existing) {
    const existingFingerprint = coordinationFingerprint(existing);
    if (existingFingerprint !== incomingFingerprint) {
      throw new Error(
        "A different vault with the same id already exists on this device. Remove it first to avoid signer mismatch."
      );
    }
    return existing;
  }
  const record: BtcVaultRecord = {
    id: payload.id,
    name: payload.name,
    kind: payload.kind ?? ((payload.signerPubkeys?.length ?? 0) > 1 ? "multisig" : "solo"),
    derivedVaultAddress: payload.derivedVaultAddress,
    linkedBtcAddress: payload.linkedBtcAddress,
    signerPubkeys: payload.signerPubkeys ?? [],
    signerLabels: payload.signerLabels ?? [],
    signerHint: "",
    threshold: payload.threshold ?? "1",
    witnessScriptHex: payload.witnessScriptHex,
    scriptPubkeyHex: payload.scriptPubkeyHex,
    network: payload.network,
    createdAt: new Date().toISOString(),
  };
  clearVaultDeleted(record.id);
  saveAll([...loadBtcVaults(), record]);
  notifyBtcVaultsChanged();
  return record;
}
