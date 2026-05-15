import { redis } from './redis';
import { KEYS } from './redis/keys';

interface ProStatus {
  isPro: boolean;
  paymentRef?: string;
  source?: string;
}

interface ProRecord {
  paymentRef: string;
  source: string;
}

export async function getProStatus(wallet: string): Promise<ProStatus> {
  const record = await redis.get<ProRecord>(KEYS.userPro(wallet));
  if (!record) return { isPro: false };
  return { isPro: true, paymentRef: record.paymentRef, source: record.source };
}

export async function grantPro(wallet: string, paymentRef: string, source: string): Promise<void> {
  await redis.set(KEYS.userPro(wallet), JSON.stringify({ paymentRef, source }));
}

export async function revokePro(wallet: string): Promise<void> {
  await redis.del(KEYS.userPro(wallet));
}

export async function grantProDev(wallet: string): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;
  await grantPro(wallet, 'dev_payment_test', 'dev');
}
