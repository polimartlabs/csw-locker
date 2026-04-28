/**
 * Real Bitcoin script builders for CSW Locker: CLTV time-locks and m-of-n P2WSH multisig vaults.
 *
 * Implementation notes:
 * - We use `@scure/btc-signer` (pure-JS, browser-safe, Paul Miller) — no `Buffer` polyfills.
 * - Addresses and scripts are network-aware: we pick `NETWORK` (mainnet) or `TEST_NETWORK` based on the
 *   owner's own address prefix (reusing `getClientConfig` from `chain-config`).
 * - CLTV uses absolute lock-time in SECONDS (Unix). BIP-65 treats values >= 500_000_000 as timestamps,
 *   which is what we want for a user-friendly date picker. CSV (relative) isn't used here.
 */

import { hex } from "@scure/base";
import { Script, ScriptNum, p2ms, p2wsh, NETWORK, TEST_NETWORK } from "@scure/btc-signer";

type BTC_NETWORK = typeof NETWORK;
import { getClientConfig } from "@/utils/chain-config";

/** BIP-65: values < 500_000_000 are treated as block heights; we always want timestamps. */
export const CLTV_TIMESTAMP_THRESHOLD = 500_000_000;

export function btcNetworkFromAddress(address: string): BTC_NETWORK {
  return getClientConfig(address).network === "mainnet" ? NETWORK : TEST_NETWORK;
}

export function networkLabelFromAddress(address: string): "mainnet" | "testnet" {
  return getClientConfig(address).network === "mainnet" ? "mainnet" : "testnet";
}

export function parsePubkey(pubkeyHex: string): Uint8Array {
  const clean = pubkeyHex.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]+$/.test(clean)) throw new Error("Public key must be hex.");
  const bytes = hex.decode(clean);
  if (bytes.length !== 33) {
    throw new Error(
      `Expected a 33-byte compressed secp256k1 public key, got ${bytes.length} bytes. ` +
        `Leather / other Stacks wallets return compressed pubkeys from getAddresses().`
    );
  }
  if (bytes[0] !== 0x02 && bytes[0] !== 0x03) {
    throw new Error("Compressed public key must start with 0x02 or 0x03.");
  }
  return bytes;
}

/* --------------------------------------------------------------------------------------------- *
 *  CLTV P2WSH lock                                                                              *
 *  ----------------                                                                             *
 *  Witness script:                                                                              *
 *    <unlockUnixSec> OP_CHECKLOCKTIMEVERIFY OP_DROP <ownerPubkey> OP_CHECKSIG                   *
 *                                                                                               *
 *  Can be spent by:                                                                             *
 *    - ownerPubkey signature                                                                    *
 *    - in a transaction whose `nLockTime` is >= unlockUnixSec AND whose input's nSequence       *
 *      is < 0xFFFFFFFF (BIP-65 rules).                                                          *
 *                                                                                               *
 *  This is the classic "single-sig + absolute timelock" pattern, exactly what a user-facing     *
 *  "lock until date X" expects.                                                                 *
 * --------------------------------------------------------------------------------------------- */

export function buildCltvWitnessScript(
  ownerPubkey: Uint8Array,
  unlockUnixSec: number
): Uint8Array {
  if (!Number.isFinite(unlockUnixSec) || unlockUnixSec <= CLTV_TIMESTAMP_THRESHOLD) {
    throw new Error(
      "Unlock time must be a Unix timestamp (seconds) greater than 500,000,000 — roughly Nov 5, 1985."
    );
  }
  return Script.encode([
    ScriptNum().encode(BigInt(unlockUnixSec)),
    "CHECKLOCKTIMEVERIFY",
    "DROP",
    ownerPubkey,
    "CHECKSIG",
  ]);
}

export type CltvLockDerivation = {
  address: string;
  witnessScriptHex: string;
  scriptPubkeyHex: string;
};

export function deriveCltvP2wshLock(
  ownerPubkey: Uint8Array,
  unlockUnixSec: number,
  network: BTC_NETWORK
): CltvLockDerivation {
  const witnessScript = buildCltvWitnessScript(ownerPubkey, unlockUnixSec);
  // p2wsh wraps a "child" payment whose `.script` becomes the witnessScript.
  // For custom scripts we use `{ type: "unknown", script }` which is the documented shape.
  const wsh = p2wsh({ type: "unknown", script: witnessScript } as Parameters<typeof p2wsh>[0], network);
  if (!wsh.address) {
    throw new Error("Failed to derive P2WSH address for CLTV lock.");
  }
  return {
    address: wsh.address,
    witnessScriptHex: hex.encode(witnessScript),
    scriptPubkeyHex: hex.encode(wsh.script),
  };
}

/* --------------------------------------------------------------------------------------------- *
 *  Solo P2WSH vault (single-sig, user-owned "pocket")                                           *
 *  ---------------------------------------------------                                          *
 *  Witness script: `<ownerPubkey> OP_CHECKSIG`                                                  *
 *                                                                                               *
 *  Behaves like a named sub-wallet: the user — and only the user — can sign a spend. We wrap   *
 *  it in P2WSH (rather than using plain P2WPKH) so every kind of vault in the app has the same  *
 *  on-chain shape and PSBT sign/finalize/broadcast path.                                        *
 * --------------------------------------------------------------------------------------------- */

export type SoloVaultDerivation = {
  address: string;
  witnessScriptHex: string;
  scriptPubkeyHex: string;
  ownerPubkeyHex: string;
  nonceCommitmentHex?: string;
};

export function deriveSoloP2wshVault(
  ownerPubkey: Uint8Array,
  network: BTC_NETWORK,
  nonceCommitmentHex?: string,
  unlockUnixSec?: number
): SoloVaultDerivation {
  const cleanedNonce = nonceCommitmentHex?.toLowerCase().replace(/^0x/, "");
  const nonceBytes =
    cleanedNonce && /^[0-9a-f]{16,64}$/.test(cleanedNonce)
      ? hex.decode(cleanedNonce)
      : null;
  // When nonce is provided, commit it in script so each vault can derive a unique
  // address even for the same owner key: `<nonce> DROP <pubkey> CHECKSIG`.
  const scriptParts: Array<Uint8Array | string> = [];
  if (unlockUnixSec != null) {
    if (!Number.isFinite(unlockUnixSec) || unlockUnixSec <= CLTV_TIMESTAMP_THRESHOLD) {
      throw new Error("Unlock time must be a Unix timestamp (seconds) in the future.");
    }
    scriptParts.push(ScriptNum().encode(BigInt(unlockUnixSec)), "CHECKLOCKTIMEVERIFY", "DROP");
  }
  if (nonceBytes) {
    scriptParts.push(nonceBytes, "DROP");
  }
  scriptParts.push(ownerPubkey, "CHECKSIG");
  const witnessScript = Script.encode(scriptParts);
  const wsh = p2wsh({ type: "unknown", script: witnessScript } as Parameters<typeof p2wsh>[0], network);
  if (!wsh.address) {
    throw new Error("Failed to derive vault address.");
  }
  return {
    address: wsh.address,
    witnessScriptHex: hex.encode(witnessScript),
    scriptPubkeyHex: hex.encode(wsh.script),
    ownerPubkeyHex: hex.encode(ownerPubkey),
    nonceCommitmentHex: cleanedNonce ?? undefined,
  };
}

/* --------------------------------------------------------------------------------------------- *
 *  m-of-n P2WSH multisig vault                                                                  *
 *  ----------------------------                                                                 *
 *  Witness script: `m <pubkey1> <pubkey2> ... <pubkeyN> n OP_CHECKMULTISIG`                     *
 *                                                                                               *
 *  Spending requires cooperation of `threshold` signers. Addresses are deterministic from the   *
 *  sorted pubkey list so every cosigner derives the same one.                                   *
 * --------------------------------------------------------------------------------------------- */

export type MultisigVaultDerivation = {
  address: string;
  witnessScriptHex: string;
  scriptPubkeyHex: string;
  sortedPubkeysHex: string[];
};

export function deriveMultisigP2wshVault(
  pubkeys: Uint8Array[],
  threshold: number,
  network: BTC_NETWORK
): MultisigVaultDerivation {
  if (pubkeys.length === 0) throw new Error("At least one signer is required.");
  if (threshold < 1 || threshold > pubkeys.length) {
    throw new Error(`Threshold must be between 1 and ${pubkeys.length}.`);
  }
  // BIP-67 lexicographic sort — standard for shared multisig so every cosigner derives the same address.
  const sorted = [...pubkeys].sort((a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  });
  const ms = p2ms(threshold, sorted);
  const wsh = p2wsh(ms, network);
  if (!wsh.address) {
    throw new Error("Failed to derive P2WSH address for multisig vault.");
  }
  return {
    address: wsh.address,
    witnessScriptHex: hex.encode(ms.script),
    scriptPubkeyHex: hex.encode(wsh.script),
    sortedPubkeysHex: sorted.map((p) => hex.encode(p)),
  };
}
