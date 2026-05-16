import { redis } from './redis';
import { KEYS } from './redis/keys';

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

interface RefRecord {
  wallet: string;
  createdAt: number;
  clicks: number;
  conversions: number;
  earningsUsd: number;
}

function generateCode(): string {
  return Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

export async function generateRefCode(wallet: string): Promise<string> {
  const existing = await redis.get<string>(KEYS.refWallet(wallet));
  if (existing) return existing;

  const code = generateCode();
  const record: RefRecord = { wallet, createdAt: Date.now(), clicks: 0, conversions: 0, earningsUsd: 0 };

  await Promise.all([
    redis.set(KEYS.refCode(code), JSON.stringify(record)),
    redis.set(KEYS.refWallet(wallet), code),
  ]);

  return code;
}

export async function getRefStats(code: string): Promise<RefRecord | null> {
  const raw = await redis.get(KEYS.refCode(code));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as RefRecord);
}

export async function trackClick(code: string): Promise<void> {
  const record = await getRefStats(code);
  if (!record) return;
  record.clicks += 1;
  await redis.set(KEYS.refCode(code), JSON.stringify(record));
}

export async function trackConversion(code: string, amountUsd: number, payingWallet: string): Promise<void> {
  const record = await getRefStats(code);
  if (!record) return;
  if (record.wallet === payingWallet) return; // block self-referral
  record.conversions += 1;
  record.earningsUsd += amountUsd * 0.5;
  await redis.set(KEYS.refCode(code), JSON.stringify(record));
}
