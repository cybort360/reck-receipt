import { redis } from './redis';
import { KEYS } from './redis/keys';

export function generateProAmount(): number {
  const noise = Math.floor(Math.random() * 9999) + 1;
  const decimal = noise / 1_000_000;
  return parseFloat((4.99 + decimal).toFixed(6));
}

export function generateSignalsAmount(): number {
  const noise = Math.floor(Math.random() * 9999) + 1;
  const decimal = noise / 1_000_000;
  return parseFloat((14.99 + decimal).toFixed(6));
}

export async function createPaymentSession(
  wallet: string,
  plan: 'pro' | 'signals' = 'pro',
): Promise<{ amount: number; expiresAt: number }> {
  const amount = plan === 'signals' ? generateSignalsAmount() : generateProAmount();
  const createdAt = Date.now();
  const expiresAt = createdAt + 1800 * 1000;

  await redis.set(
    KEYS.payment(String(amount)),
    JSON.stringify({ wallet, plan, createdAt, status: 'pending' }),
    { ex: 1800 },
  );

  return { amount, expiresAt };
}

export function getSolanaPayUrl(amount: number): string {
  const treasury = process.env.TREASURY_WALLET;
  const usdcMint = process.env.USDC_MINT;
  return `solana:${treasury}?amount=${amount}&spl-token=${usdcMint}&label=RektReceipt%20Pro&message=Upgrade%20to%20Pro`;
}
