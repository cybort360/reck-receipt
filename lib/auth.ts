import crypto from 'crypto';
import nacl from 'tweetnacl';
import { decodeUTF8 } from 'tweetnacl-util';
import bs58 from 'bs58';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function storeNonce(wallet: string, nonce: string): Promise<void> {
  await redis.set(KEYS.authNonce(wallet), nonce, { ex: 300 });
}

export async function getNonce(wallet: string): Promise<string | null> {
  return redis.get<string>(KEYS.authNonce(wallet));
}

export async function consumeNonce(wallet: string): Promise<string | null> {
  return redis.getdel<string>(KEYS.authNonce(wallet));
}

export function verifySignature(
  wallet: string,
  nonce: string,
  signatureBase64: string,
): boolean {
  try {
    const message = decodeUTF8(`Sign in to RektReceipt: ${nonce}`);
    const signature = new Uint8Array(Buffer.from(signatureBase64, 'base64'));
    const publicKey = bs58.decode(wallet);
    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch {
    return false;
  }
}

export async function getSession(
  token: string,
): Promise<{ wallet: string; createdAt: number } | null> {
  const raw = await redis.get<{ wallet: string; createdAt: number }>(KEYS.authSession(token));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function isAdminToken(token: string): Promise<boolean> {
  if (!token) return false;
  const val = await redis.get(`rr:v1:admin:session:${token}`);
  return val === '1';
}

export async function createSession(wallet: string): Promise<string> {
  const token = crypto.randomBytes(16).toString('hex');
  await redis.set(
    KEYS.authSession(token),
    JSON.stringify({ wallet, createdAt: Date.now() }),
    { ex: 86400 },
  );
  return token;
}
