export type PortfolioUsdInput = {
  stxBalance: number | null | undefined;
  sBtcBalance: number | null | undefined;
  btcBalanceSats: number | null | undefined;
  lockedBtcSats?: number | null | undefined;
  stxUsd: number | null | undefined;
  btcUsd: number | null | undefined;
};

export function computePortfolioUsd(input: PortfolioUsdInput): number {
  let total = 0;
  if (input.stxBalance != null && input.stxUsd != null) total += input.stxBalance * input.stxUsd;
  if (input.sBtcBalance != null && input.btcUsd != null) total += input.sBtcBalance * input.btcUsd;
  if (input.btcBalanceSats != null && input.btcUsd != null) total += (input.btcBalanceSats / 1e8) * input.btcUsd;
  if (input.lockedBtcSats && input.lockedBtcSats > 0 && input.btcUsd != null) {
    total += (input.lockedBtcSats / 1e8) * input.btcUsd;
  }
  return total;
}
