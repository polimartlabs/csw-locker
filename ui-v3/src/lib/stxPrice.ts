async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Utility to fetch the current STX price in USD with multiple public fallbacks.
export async function fetchStxUsdPrice(): Promise<number | null> {
  const coinGecko = await fetchJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd"
  );
  const cgUsd = (coinGecko as { blockstack?: { usd?: number } } | null)?.blockstack?.usd;
  if (typeof cgUsd === "number" && cgUsd > 0) return cgUsd;

  const cryptoCompare = await fetchJson(
    "https://min-api.cryptocompare.com/data/price?fsym=STX&tsyms=USD"
  );
  const ccUsd = (cryptoCompare as { USD?: number } | null)?.USD;
  if (typeof ccUsd === "number" && ccUsd > 0) return ccUsd;

  return null;
}
