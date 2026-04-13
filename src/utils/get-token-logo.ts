
export async function fetchTokenLogoUrl(tokenName: string): Promise<string | null> {
  try {
    // CoinGecko uses lowercase and hyphens for token names (e.g., "bitcoin", "usd-coin")
    const id = tokenName.toLowerCase().replace(/\s+/g, '-');
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.image?.large || data?.image?.thumb || null;
  } catch {
    return null;
  }
}