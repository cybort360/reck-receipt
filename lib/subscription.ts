import { redis } from './redis';
import { KEYS } from './redis/keys';
import type { SignalProvider } from './signals';

export interface SubscriptionRecord {
  subscriberWallet: string;
  providerWallet: string;
  priceUsdc: number;
  grantedAt: number;
  expiresAt: number;
}

interface SubscriptionPaymentSession {
  subscriberWallet: string;
  providerWallet: string;
  priceUsdc: number;
  status: 'pending' | 'paid';
}

function generateUniqueAmount(priceUsdc: number): number {
  const noise = Math.floor(Math.random() * 9999) + 1;
  return parseFloat((priceUsdc + noise / 1_000_000).toFixed(6));
}

export async function createSubscriptionSession(
  subscriberWallet: string,
  providerWallet: string,
  priceUsdc: number,
): Promise<number> {
  const amount = generateUniqueAmount(priceUsdc);
  await redis.set(
    KEYS.subscriptionPayment(String(amount)),
    JSON.stringify({ subscriberWallet, providerWallet, priceUsdc, status: 'pending' }),
    { ex: 1800 },
  );
  return amount;
}

export async function verifyAndGrantSubscription(
  amount: string,
): Promise<{ success: boolean; error?: string }> {
  const raw = await redis.get(KEYS.subscriptionPayment(amount));
  if (!raw) {
    return { success: false, error: 'Payment session not found or expired' };
  }

  const session: SubscriptionPaymentSession =
    typeof raw === 'string' ? JSON.parse(raw) : (raw as SubscriptionPaymentSession);

  if (session.status === 'paid') {
    return { success: true };
  }

  const { subscriberWallet, providerWallet, priceUsdc } = session;
  const now = Date.now();

  const subscriptionRecord: SubscriptionRecord = {
    subscriberWallet,
    providerWallet,
    priceUsdc,
    grantedAt: now,
    expiresAt: now + 2592000 * 1000,
  };

  // Read provider before launching writes so we can increment subscriber count
  const providerRaw = await redis.get(KEYS.signalProvider(providerWallet));

  const writes: Promise<unknown>[] = [
    // Mark session paid (keep original TTL by re-setting with remaining 1800s)
    redis.set(
      KEYS.subscriptionPayment(amount),
      JSON.stringify({ ...session, status: 'paid' }),
      { ex: 1800 },
    ),
    // Store 30-day subscription record
    redis.set(
      KEYS.subscription(subscriberWallet, providerWallet),
      JSON.stringify(subscriptionRecord),
      { ex: 2592000 },
    ),
    // Credit 80% of price to provider earnings (atomic float increment)
    redis.incrbyfloat(KEYS.providerEarnings(providerWallet), priceUsdc * 0.8),
  ];

  // Increment subscriber count on the provider object if it still exists
  if (providerRaw) {
    const provider: SignalProvider =
      typeof providerRaw === 'string'
        ? JSON.parse(providerRaw)
        : (providerRaw as SignalProvider);
    provider.subscribers += 1;
    writes.push(redis.set(KEYS.signalProvider(providerWallet), JSON.stringify(provider)));
  }

  await Promise.all(writes);

  return { success: true };
}

export async function getSubscription(
  subscriberWallet: string,
  providerWallet: string,
): Promise<SubscriptionRecord | null> {
  const raw = await redis.get(KEYS.subscription(subscriberWallet, providerWallet));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as SubscriptionRecord);
}

export async function getProviderEarnings(wallet: string): Promise<number> {
  const raw = await redis.get(KEYS.providerEarnings(wallet));
  if (!raw) return 0;
  return parseFloat(String(raw));
}
