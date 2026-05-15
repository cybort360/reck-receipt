import { redis } from './redis';
import { KEYS } from './redis/keys';

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

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export async function getSolPriceAtTimestamp(timestamp: number): Promise<number> {
  const date = formatDate(timestamp);
  const key = KEYS.price(date);

  const cached = await redis.get<number>(key);
  if (cached !== null) return cached;

  try {
    const url = `https://api.coingecko.com/api/v3/coins/solana/history?date=${date}&localization=false`;
    const res = await fetch(url);
    if (!res.ok) return FALLBACK_PRICE;
    const data = await res.json();
    const price: number = data.market_data.current_price.usd;
    await redis.set(key, price, { ex: 2592000 });
    return price;
  } catch {
    return FALLBACK_PRICE;
  }
}
