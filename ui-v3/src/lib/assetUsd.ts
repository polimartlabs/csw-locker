import { fetchStxUsdPrice } from "@/lib/stxPrice";
import { getBtcUsdPrice } from "@/services/btcMempoolService";

/** Prefer primary STX spot source, then fallback. */
export function selectStxUsd(
  primaryUsd: number | null | undefined,
  fallbackUsd: number | null | undefined
): number | null {
  if (primaryUsd != null && +primaryUsd > 0) return +primaryUsd;
  if (fallbackUsd != null && +fallbackUsd > 0) return +fallbackUsd;
  return null;
}

export async function fetchStxSpotUsd(): Promise<{
  usd: number | null;
  fromPrimary: boolean;
}> {
  const primary = await fetchStxUsdPrice();
  if (primary != null && primary > 0) return { usd: primary, fromPrimary: true };
  return { usd: null, fromPrimary: false };
}

export async function fetchAllAssetSpotUsd(): Promise<{
  stxUsd: number | null;
  btcUsd: number | null;
}> {
  const [stx, btc] = await Promise.all([fetchStxSpotUsd(), getBtcUsdPrice()]);
  return { stxUsd: stx.usd, btcUsd: btc != null && btc > 0 ? btc : null };
}
