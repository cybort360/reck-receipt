import { redis } from './redis';
import { KEYS } from './redis/keys';

export interface SignalProvider {
  wallet: string;
  name: string;
  bio: string;
  priceUsdc: number;
  rektScore: number;
  grade: string;
  subscribers: number;
  createdAt: number;
}

export interface SignalCall {
  id: string;
  providerWallet: string;
  mint: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  note: string;
  timestamp: number;
  status?: 'open' | 'closed';
  closedAt?: number;
  closedPrice?: number;
  finalPnlPercent?: number;
}

export async function getSignalProvider(wallet: string): Promise<SignalProvider | null> {
  const raw = await redis.get(KEYS.signalProvider(wallet));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as SignalProvider);
}

export async function listSignalProviders(): Promise<SignalProvider[]> {
  const wallets = (await redis.zrange(KEYS.signalIndex(), 0, -1)) as string[];
  if (wallets.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const wallet of wallets) {
    pipeline.get(KEYS.signalProvider(wallet));
  }
  const results = await pipeline.exec<(SignalProvider | null)[]>();

  return results
    .map((raw) => {
      if (!raw) return null;
      return typeof raw === 'string' ? (JSON.parse(raw) as SignalProvider) : (raw as SignalProvider);
    })
    .filter((p): p is SignalProvider => p !== null);
}

export async function postSignalCall(
  wallet: string,
  call: SignalCall,
): Promise<void> {
  const key = KEYS.signalCalls(wallet);
  await redis.lpush(key, JSON.stringify(call));
  await redis.ltrim(key, 0, 99);
}

export async function getSignalCalls(
  wallet: string,
  limit = 20,
): Promise<SignalCall[]> {
  const raws = await redis.lrange(KEYS.signalCalls(wallet), 0, limit - 1);
  return raws.map((raw) =>
    typeof raw === 'string' ? (JSON.parse(raw) as SignalCall) : (raw as SignalCall),
  );
}

export async function updateSignalCall(
  wallet: string,
  callId: string,
  updates: Partial<SignalCall>,
): Promise<void> {
  const key = KEYS.signalCalls(wallet);
  const raws = await redis.lrange(key, 0, -1);
  const idx = raws.findIndex((raw) => {
    const c: SignalCall = typeof raw === 'string' ? JSON.parse(raw) : (raw as SignalCall);
    return c.id === callId;
  });
  if (idx === -1) return;
  const existing: SignalCall =
    typeof raws[idx] === 'string' ? JSON.parse(raws[idx] as string) : (raws[idx] as SignalCall);
  await redis.lset(key, idx, JSON.stringify({ ...existing, ...updates }));
}
