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
