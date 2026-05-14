const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

const FALLBACK_PRICE = 150;

export async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch(COINGECKO_URL);
    if (!res.ok) return FALLBACK_PRICE;
    const data = await res.json();
    return data.solana.usd;
  } catch {
    return FALLBACK_PRICE;
  }
}

const historicalPriceCache = new Map<string, number>();

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export async function getSolPriceAtTimestamp(timestamp: number): Promise<number> {
  const date = formatDate(timestamp);

  const cached = historicalPriceCache.get(date);
  if (cached !== undefined) return cached;

  try {
    const url = `https://api.coingecko.com/api/v3/coins/solana/history?date=${date}&localization=false`;
    const res = await fetch(url);
    if (!res.ok) return FALLBACK_PRICE;
    const data = await res.json();
    const price: number = data.market_data.current_price.usd;
    historicalPriceCache.set(date, price);
    return price;
  } catch {
    return FALLBACK_PRICE;
  }
}
