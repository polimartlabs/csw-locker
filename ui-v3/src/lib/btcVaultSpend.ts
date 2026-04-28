/**
 * Build a PSBT that spends from a BTC vault (solo or shared) to an arbitrary recipient.
 *
 * The vault's witness script is stored in the vault record at creation time. This helper:
 *   - Fetches current UTXOs at the vault's deposit address
 *   - Picks fee rate from mempool.space
 *   - Runs greedy coin selection (largest-first) to cover amount + fee
 *   - Constructs a PSBT (with witnessUtxo + witnessScript on each input) that any
 *     cooperating wallet can sign via `signPsbt`
 *
 * Fees: the spender pays — we take them from the change (or, if change is dust, from the
 * destination output). vsize is approximated per input based on vault kind.
 */

import { hex, base64 } from "@scure/base";
import { Transaction } from "@scure/btc-signer";
import { btcNetworkFromAddress, networkLabelFromAddress } from "@/lib/btcScript";
import { getBtcVault, getVaultKind, type BtcVaultRecord } from "@/lib/btcVaultStorage";
import { getAddressUtxos } from "@/services/btcMempoolService";
import { getRecommendedFeerates, pickFeerateSatPerVb } from "@/services/bitcoinTxService";
import { computeBtcPlatformFee } from "@/lib/platformFee";

/** Bitcoin Core's P2WPKH dust floor. */
const P2WPKH_DUST_SATS = 294;

/** Rough vsize (vB) per input — generous on the multisig side so we don't underpay fees. */
const SOLO_INPUT_VSIZE = 105;
const MULTISIG_INPUT_VSIZE_BASE = 80;
const MULTISIG_INPUT_VSIZE_PER_SIG = 36; // each sig push

/** Fixed portion of a simple "1 recipient + 1 change" tx. */
const TX_BASE_VSIZE = 50;
/** Per-output vsize (P2WPKH / P2WSH). */
const PER_OUTPUT_VSIZE = 31;

export type BuildVaultSpendArgs = {
  vault: BtcVaultRecord;
  recipientAddress: string;
  amountSats: number;
  /** Fee preset override. Default = "halfHour". */
  feePreset?: "fastest" | "halfHour" | "hour" | "economy";
};

export type BuildVaultSpendResult = {
  psbtBase64: string;
  amountSats: number;
  feeSats: number;
  platformFeeSats: number;
  platformFeeTreasury: string | null;
  changeSats: number;
  inputCount: number;
  network: "mainnet" | "testnet";
  signaturesRequired: number;
  signerCount: number;
};

export type BuildVaultShutdownResult = {
  psbtBase64: string;
  sweepAmountSats: number;
  feeSats: number;
  platformFeeSats: number;
  platformFeeTreasury: string | null;
  inputCount: number;
  network: "mainnet" | "testnet";
  signaturesRequired: number;
  signerCount: number;
};

export async function buildVaultSpendPsbt(args: BuildVaultSpendArgs): Promise<BuildVaultSpendResult> {
  const { vault, recipientAddress, amountSats } = args;
  if (!vault.witnessScriptHex || !vault.scriptPubkeyHex) {
    throw new Error("This vault isn't spendable on-chain. Delete and re-create it.");
  }
  if (!Number.isFinite(amountSats) || amountSats < P2WPKH_DUST_SATS) {
    throw new Error(`Amount must be at least ${P2WPKH_DUST_SATS} sats.`);
  }
  if (!recipientAddress.trim()) {
    throw new Error("Enter a recipient address.");
  }

  const kind = getVaultKind(vault);
  const threshold = Math.max(1, parseInt(vault.threshold || "1", 10) || 1);
  const signerCount = vault.signerPubkeys?.length ?? 1;

  const network = btcNetworkFromAddress(vault.linkedBtcAddress);
  const networkLabel = networkLabelFromAddress(vault.linkedBtcAddress);

  const [utxos, fees] = await Promise.all([
    getAddressUtxos(vault.derivedVaultAddress),
    getRecommendedFeerates(vault.linkedBtcAddress),
  ]);
  if (utxos.length === 0) {
    throw new Error("This vault has no BTC in it yet.");
  }

  const feerate = Math.max(5, fees ? pickFeerateSatPerVb(fees, args.feePreset ?? "halfHour") : 5);

  const platformQuote = computeBtcPlatformFee(amountSats, networkLabel);
  const platformFeeSatsRaw = platformQuote.enabled ? platformQuote.feeSats : 0;
  // Avoid producing non-standard dust outputs to treasury.
  const platformFeeSats = platformFeeSatsRaw >= P2WPKH_DUST_SATS ? platformFeeSatsRaw : 0;

  const perInputVsize =
    kind === "solo" ? SOLO_INPUT_VSIZE : MULTISIG_INPUT_VSIZE_BASE + MULTISIG_INPUT_VSIZE_PER_SIG * threshold;

  // Output count grows if we're adding a platform-fee output. Budget fee estimation accordingly.
  const baseOutputCount = 2; // recipient + change
  const maxOutputCount = baseOutputCount + (platformFeeSats > 0 ? 1 : 0);

  // Greedy coin selection, largest-first.
  const sorted = [...utxos].sort((a, b) => b.value - a.value);
  const picked: typeof sorted = [];
  let inSum = 0;
  let feeSats = 0;
  let change = 0;
  for (const u of sorted) {
    picked.push(u);
    inSum += u.value;
    const vsize = TX_BASE_VSIZE + picked.length * perInputVsize + maxOutputCount * PER_OUTPUT_VSIZE;
    feeSats = Math.max(200, Math.ceil(feerate * vsize));
    change = inSum - amountSats - feeSats - platformFeeSats;
    if (change >= 0) break;
  }
  if (change < 0) {
    throw new Error("Not enough BTC in the vault to cover the amount + fees.");
  }

  const witnessScript = hex.decode(vault.witnessScriptHex);
  const scriptPubkey = hex.decode(vault.scriptPubkeyHex);

  const tx = new Transaction({ version: 2, allowUnknownInputs: true });
  for (const u of picked) {
    tx.addInput({
      txid: u.txid,
      index: u.vout,
      witnessUtxo: { script: scriptPubkey, amount: BigInt(u.value) },
      witnessScript,
      sequence: 0xfffffffd,
    });
  }
  tx.addOutputAddress(recipientAddress.trim(), BigInt(amountSats), network);
  if (platformFeeSats > 0 && platformQuote.treasury) {
    tx.addOutputAddress(platformQuote.treasury, BigInt(platformFeeSats), network);
  }
  let effectiveChange = change;
  if (change >= P2WPKH_DUST_SATS) {
    tx.addOutputAddress(vault.derivedVaultAddress, BigInt(change), network);
  } else {
    // Change is dust — fold it into the miner fee rather than attaching a non-standard output.
    feeSats += change;
    effectiveChange = 0;
  }

  const psbtBytes = tx.toPSBT();
  return {
    psbtBase64: base64.encode(psbtBytes),
    amountSats,
    feeSats,
    platformFeeSats,
    platformFeeTreasury: platformFeeSats > 0 ? platformQuote.treasury : null,
    changeSats: effectiveChange,
    inputCount: picked.length,
    network: networkLabel,
    signaturesRequired: kind === "solo" ? 1 : threshold,
    signerCount,
  };
}

/**
 * Build a "shutdown" PSBT:
 * - spend all vault UTXOs
 * - send the full remaining balance (minus fees and optional platform fee)
 *   to `recipientAddress` (typically the owner wallet)
 * - no change output is created
 */
export async function buildVaultShutdownPsbt(args: {
  vault: BtcVaultRecord;
  recipientAddress: string;
  feePreset?: "fastest" | "halfHour" | "hour" | "economy";
}): Promise<BuildVaultShutdownResult> {
  const { vault, recipientAddress } = args;
  if (!vault.witnessScriptHex || !vault.scriptPubkeyHex) {
    throw new Error("This vault isn't spendable on-chain. Delete and re-create it.");
  }
  if (!recipientAddress.trim()) throw new Error("Missing shutdown recipient address.");

  const kind = getVaultKind(vault);
  const threshold = Math.max(1, parseInt(vault.threshold || "1", 10) || 1);
  const signerCount = vault.signerPubkeys?.length ?? 1;
  const network = btcNetworkFromAddress(vault.linkedBtcAddress);
  const networkLabel = networkLabelFromAddress(vault.linkedBtcAddress);

  const [utxos, fees] = await Promise.all([
    getAddressUtxos(vault.derivedVaultAddress),
    getRecommendedFeerates(vault.linkedBtcAddress),
  ]);
  if (utxos.length === 0) throw new Error("This vault has no BTC in it yet.");
  const inSum = utxos.reduce((acc, u) => acc + u.value, 0);

  const feerate = Math.max(5, fees ? pickFeerateSatPerVb(fees, args.feePreset ?? "halfHour") : 5);
  const platformQuote = computeBtcPlatformFee(inSum, networkLabel, {
    enforceMinFloor: false,
  });
  const platformFeeSatsRaw = platformQuote.enabled ? platformQuote.feeSats : 0;
  // Avoid producing non-standard dust outputs to treasury.
  const platformFeeSats = platformFeeSatsRaw >= P2WPKH_DUST_SATS ? platformFeeSatsRaw : 0;

  const perInputVsize =
    kind === "solo" ? SOLO_INPUT_VSIZE : MULTISIG_INPUT_VSIZE_BASE + MULTISIG_INPUT_VSIZE_PER_SIG * threshold;
  const outputCount = 1 + (platformFeeSats > 0 ? 1 : 0);
  const vsize = TX_BASE_VSIZE + utxos.length * perInputVsize + outputCount * PER_OUTPUT_VSIZE;
  const feeSats = Math.max(200, Math.ceil(feerate * vsize));
  const sweepAmountSats = inSum - feeSats - platformFeeSats;
  if (sweepAmountSats < P2WPKH_DUST_SATS) {
    throw new Error(
      `Vault balance is too small after fees (${sweepAmountSats} sats). Wait for lower fees or top up first.`
    );
  }

  const witnessScript = hex.decode(vault.witnessScriptHex);
  const scriptPubkey = hex.decode(vault.scriptPubkeyHex);

  const tx = new Transaction({ version: 2, allowUnknownInputs: true });
  for (const u of utxos) {
    tx.addInput({
      txid: u.txid,
      index: u.vout,
      witnessUtxo: { script: scriptPubkey, amount: BigInt(u.value) },
      witnessScript,
      sequence: 0xfffffffd,
    });
  }
  tx.addOutputAddress(recipientAddress.trim(), BigInt(sweepAmountSats), network);
  if (platformFeeSats > 0 && platformQuote.treasury) {
    tx.addOutputAddress(platformQuote.treasury, BigInt(platformFeeSats), network);
  }

  return {
    psbtBase64: base64.encode(tx.toPSBT()),
    sweepAmountSats,
    feeSats,
    platformFeeSats,
    platformFeeTreasury: platformFeeSats > 0 ? platformQuote.treasury : null,
    inputCount: utxos.length,
    network: networkLabel,
    signaturesRequired: kind === "solo" ? 1 : threshold,
    signerCount,
  };
}

/** Convenience: fetch+build in one call, for pages that only have the vault id. */
export async function buildVaultSpendPsbtById(
  vaultId: string,
  recipientAddress: string,
  amountSats: number
): Promise<BuildVaultSpendResult> {
  const vault = getBtcVault(vaultId);
  if (!vault) throw new Error("Vault not found.");
  return buildVaultSpendPsbt({ vault, recipientAddress, amountSats });
}
