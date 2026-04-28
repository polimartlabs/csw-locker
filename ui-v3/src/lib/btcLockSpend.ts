/**
 * Build a PSBT that spends a CLTV P2WSH lock back to the owner's address.
 *
 * The transaction satisfies BIP-65 rules:
 *   - `nLockTime`  set to the current tip height/time (>= the lock's `unlockUnixSec`)
 *   - Input `nSequence` set to `0xFFFFFFFE` (not final, so OP_CHECKLOCKTIMEVERIFY is enforced)
 *
 * Fees are taken off the single output (send ~ amount - fee). We estimate vsize conservatively
 * for a single-key P2WSH-CLTV input (witness: sig + 0x01 + witnessScript).
 */

import { hex, base64 } from "@scure/base";
import { Transaction } from "@scure/btc-signer";
import { btcNetworkFromAddress, networkLabelFromAddress } from "@/lib/btcScript";
import type { BtcLockRecord } from "@/lib/btcLockStorage";
import { getAddressUtxos } from "@/services/btcMempoolService";
import { getRecommendedFeerates, pickFeerateSatPerVb } from "@/services/bitcoinTxService";
import { computeBtcPlatformFee } from "@/lib/platformFee";

/** Approximate virtual size (vB) of a spend of 1 CLTV P2WSH + 1 P2WPKH output. */
const APPROX_UNLOCK_VSIZE = 155;
const DEFAULT_FEE_PRESET = "halfHour" as const;
/** Bitcoin Core minimum for P2WPKH output — anything under this is non-standard. */
const P2WPKH_DUST_SATS = 294;

export type BuildUnlockPsbtResult = {
  psbtBase64: string;
  spendAmountSats: number;
  feeSats: number;
  platformFeeSats: number;
  platformFeeTreasury: string | null;
  inputCount: number;
  network: "mainnet" | "testnet";
};

export async function buildUnlockPsbt(lock: BtcLockRecord): Promise<BuildUnlockPsbtResult> {
  if (!lock.witnessScriptHex || !lock.scriptPubkeyHex) {
    throw new Error(
      "This lock predates on-chain enforcement. Legacy soft-locks can't be swept — remove and re-create."
    );
  }
  const network = btcNetworkFromAddress(lock.ownerBtcAddress);
  const networkLabel = networkLabelFromAddress(lock.ownerBtcAddress);

  const [utxosAll, fees] = await Promise.all([
    getAddressUtxos(lock.lockAddress),
    getRecommendedFeerates(lock.ownerBtcAddress),
  ]);

  const utxos = utxosAll.filter((u) => u.value > 0);
  if (utxos.length === 0) {
    throw new Error("No UTXOs found at the lock address — nothing to sweep.");
  }
  const totalIn = utxos.reduce((acc, u) => acc + u.value, 0);

  const feerate = fees ? pickFeerateSatPerVb(fees, DEFAULT_FEE_PRESET) : 5;
  // Budget one extra output if a platform fee will be attached.
  const platformQuote = computeBtcPlatformFee(totalIn, networkLabel, {
    enforceMinFloor: false,
  });
  const extraOutputs = platformQuote.enabled ? 1 : 0;
  const vsize = APPROX_UNLOCK_VSIZE + Math.max(0, utxos.length - 1) * 105 + extraOutputs * 31;
  const feeSats = Math.max(200, Math.ceil(feerate * vsize));
  const platformFeeSats = platformQuote.enabled ? platformQuote.feeSats : 0;
  const spendAmount = totalIn - feeSats - platformFeeSats;
  if (spendAmount < P2WPKH_DUST_SATS) {
    throw new Error(
      `After fees, the remaining amount (${spendAmount} sats) is below the dust threshold. Wait for a cheaper fee window.`
    );
  }

  const witnessScript = hex.decode(lock.witnessScriptHex);
  const scriptPubkey = hex.decode(lock.scriptPubkeyHex);

  const nowSec = Math.floor(Date.now() / 1000);
  // CLTV scripts in this app use UNIX timestamp locktimes. For compatibility,
  // use the script's exact timestamp as tx nLockTime (not current wall-clock).
  // This avoids accidentally producing a higher locktime than chain MTP.
  const lockTime = Number.isFinite(lock.unlockUnixSec) && lock.unlockUnixSec > 0 ? lock.unlockUnixSec : nowSec;

  const tx = new Transaction({ version: 2, lockTime, allowUnknownInputs: true });

  for (const u of utxos) {
    tx.addInput({
      txid: u.txid,
      index: u.vout,
      witnessUtxo: { script: scriptPubkey, amount: BigInt(u.value) },
      witnessScript,
      // sequence < 0xFFFFFFFF is required for CHECKLOCKTIMEVERIFY to be enforced.
      sequence: 0xfffffffe,
    });
  }
  tx.addOutputAddress(lock.ownerBtcAddress, BigInt(spendAmount), network);
  if (platformQuote.enabled && platformQuote.treasury && platformFeeSats > 0) {
    tx.addOutputAddress(platformQuote.treasury, BigInt(platformFeeSats), network);
  }

  const psbtBytes = tx.toPSBT();
  const psbtBase64 = base64.encode(psbtBytes);

  return {
    psbtBase64,
    spendAmountSats: spendAmount,
    feeSats,
    platformFeeSats,
    platformFeeTreasury: platformQuote.enabled ? platformQuote.treasury : null,
    inputCount: utxos.length,
    network: networkLabel,
  };
}
