import { getClientConfig } from "@/utils/chain-config";

export type MempoolFeeEstimate = {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
};

type FeePresets = "fast" | "halfHour" | "economy";

const MEMPOOL_API = {
  mainnet: "https://mempool.space/api/v1/fees/recommended",
  testnet: "https://mempool.space/testnet/api/v1/fees/recommended",
} as const;

const BLOCKSTREAM_FEE_API = {
  mainnet: "https://blockstream.info/api/fee-estimates",
  testnet: "https://blockstream.info/testnet/api/fee-estimates",
} as const;

function fromBlockstreamFeeEstimates(raw: unknown): MempoolFeeEstimate | null {
  const data = raw as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return null;
  const n1 = Number(data["1"]);
  const n3 = Number(data["3"]);
  const n6 = Number(data["6"]);
  const n12 = Number(data["12"]);
  const n24 = Number(data["24"]);
  if (![n1, n3, n6, n12, n24].some(Number.isFinite)) return null;
  const fallback = 2;
  const fastestFee = Number.isFinite(n1) ? Math.ceil(n1) : Number.isFinite(n3) ? Math.ceil(n3) : fallback;
  const halfHourFee = Number.isFinite(n3) ? Math.ceil(n3) : Number.isFinite(n6) ? Math.ceil(n6) : fastestFee;
  const hourFee = Number.isFinite(n6) ? Math.ceil(n6) : halfHourFee;
  const economyFee = Number.isFinite(n12) ? Math.ceil(n12) : Number.isFinite(n24) ? Math.ceil(n24) : hourFee;
  const minimumFee = Math.max(1, Math.min(fastestFee, halfHourFee, hourFee, economyFee));
  return { fastestFee, halfHourFee, hourFee, economyFee, minimumFee };
}

/**
 * Fetches recommended feerates (sat/vB) from the public Mempool instance.
 * For mainnet P2WPKH payment addresses, matches typical Leather/Xverse fee UX.
 */
export async function getRecommendedFeerates(
  btcAddress: string
): Promise<MempoolFeeEstimate | null> {
  const { network } = getClientConfig(btcAddress);
  const mempoolUrl = network === "mainnet" ? MEMPOOL_API.mainnet : MEMPOOL_API.testnet;
  const blockstreamUrl =
    network === "mainnet" ? BLOCKSTREAM_FEE_API.mainnet : BLOCKSTREAM_FEE_API.testnet;
  try {
    const res = await fetch(mempoolUrl);
    if (res.ok) return (await res.json()) as MempoolFeeEstimate;
  } catch {
    // Fall through to Blockstream fallback.
  }
  try {
    const res = await fetch(blockstreamUrl);
    if (!res.ok) return null;
    return fromBlockstreamFeeEstimates(await res.json());
  } catch {
    return null;
  }
}

export function pickFeerateSatPerVb(
  estimate: MempoolFeeEstimate,
  preset: FeePresets
): number {
  switch (preset) {
    case "fast":
      return estimate.fastestFee;
    case "halfHour":
      return estimate.halfHourFee;
    case "economy":
      return Math.max(estimate.economyFee, estimate.minimumFee);
    default:
      return estimate.halfHourFee;
  }
}

const roughlyBlocksForPreset: Record<FeePresets, string> = {
  fast: "~1 block",
  halfHour: "~3 blocks",
  economy: "lower priority (longer wait)",
};

export function feePresetLabel(preset: FeePresets): string {
  return roughlyBlocksForPreset[preset];
}

export function getBitcoinTxExplorerUrl(txid: string, btcAddress: string): string {
  const { network } = getClientConfig(btcAddress);
  if (network === "mainnet") {
    return `https://mempool.space/tx/${txid}`;
  }
  return `https://mempool.space/testnet/tx/${txid}`;
}
