// Utility to fetch the current STX price in USD
export async function fetchStxUsdPrice(): Promise<number | null> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd');
    const data = await res.json();
    return data?.blockstack?.usd ?? null;
  } catch {
    return null;
  }
}
