/**
 * Manual finalizer for our custom-script P2WSH-CLTV lock spends.
 *
 * `@scure/btc-signer` refuses to auto-finalize PSBT inputs whose `witnessScript` it doesn't
 * recognise as one of its built-in shapes (P2WPKH, BIP-67 multisig, taproot, …). For our
 * CLTV lock script (`<unlockTime> CLTV DROP <ownerPubkey> CHECKSIG`) it throws
 * `Error: Unknown inputs not allowed` from `finalizeIdx()`.
 *
 * The fix is straightforward: a P2WSH-CLTV spend's witness is exactly
 *
 *   [ <signature || sighashByte>, <witnessScript> ]
 *
 * After the wallet hands the PSBT back, the owner's signature lives in the input's
 * `partialSig` map (keyed by the owner's compressed pubkey) — see `signIdx()` in
 * `@scure/btc-signer/transaction.js` (it stores `partialSig: [[pubKey, sig||sighash]]`).
 * We grab that signature, write the two-item witness stack into `finalScriptWitness`
 * via `updateInput`, and let `extract()` produce the broadcastable raw tx.
 */

import { hex, base64 } from "@scure/base";
import { Transaction } from "@scure/btc-signer";
import type { BtcLockRecord } from "@/lib/btcLockStorage";

function eqBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Build the broadcastable raw-tx hex for a CLTV lock sweep, given the wallet-signed
 * PSBT (base64) and the lock record (which carries `ownerPubkey` and `witnessScriptHex`).
 *
 * Throws if any input is missing the owner's `partialSig` — that means the wallet
 * silently skipped signing it (usually a wrong-network mismatch or the wallet not
 * recognising the witnessUtxo).
 */
export function finalizeCltvSpendPsbt(
  psbtBase64: string,
  lock: BtcLockRecord
): { rawHex: string; txid: string } {
  if (!lock.witnessScriptHex) {
    throw new Error("Lock has no witnessScript — can't finalize spend.");
  }
  if (!lock.ownerPubkey) {
    throw new Error("Lock has no owner pubkey — can't match the wallet signature.");
  }
  const witnessScript = hex.decode(lock.witnessScriptHex);
  const ownerPubkey = hex.decode(lock.ownerPubkey.toLowerCase().replace(/^0x/, ""));

  // `allowUnknownInputs` lets us load a PSBT whose witnessScript isn't one of @scure's
  // built-in shapes — required for our CLTV script.
  const tx = Transaction.fromPSBT(base64.decode(psbtBase64), {
    allowUnknownInputs: true,
  });

  for (let idx = 0; idx < tx.inputsLength; idx++) {
    const input = tx.getInput(idx);
    const sigEntry = (input.partialSig ?? []).find(([pk]) => eqBytes(pk, ownerPubkey));
    if (!sigEntry) {
      throw new Error(
        `Wallet returned no signature for input ${idx}. ` +
          `Make sure the connected wallet owns the address that created this lock.`
      );
    }
    const [, sigWithSighash] = sigEntry;
    // Witness for `<unlockTime> CLTV DROP <pubkey> CHECKSIG`: just sig + the script itself.
    tx.updateInput(
      idx,
      { finalScriptWitness: [sigWithSighash, witnessScript] },
      true
    );
  }

  const rawBytes = tx.extract();
  return {
    rawHex: bytesToHex(rawBytes),
    txid: tx.id,
  };
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}
