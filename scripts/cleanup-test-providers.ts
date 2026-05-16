import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEYS = {
  signalProvider: (wallet: string) => `rr:v1:signal:provider:${wallet}`,
  signalCalls: (wallet: string) => `rr:v1:signal:calls:${wallet}`,
  signalIndex: () => `rr:v1:idx:signal-providers`,
  authSession: (token: string) => `rr:v1:auth:session:${token}`,
};

async function main() {
  let deleted = 0;

  // 1. Get all provider wallets from the sorted set
  const wallets = await redis.zrange<string[]>(KEYS.signalIndex(), 0, -1);
  console.log(`Found ${wallets.length} provider(s) in signal index.`);

  // 2. Delete provider keys
  for (const wallet of wallets) {
    const key = KEYS.signalProvider(wallet);
    await redis.del(key);
    console.log(`Deleted ${key}`);
    deleted++;
  }

  // 3. Delete signal call keys
  for (const wallet of wallets) {
    const key = KEYS.signalCalls(wallet);
    await redis.del(key);
    console.log(`Deleted ${key}`);
    deleted++;
  }

  // 4. Remove all members from the sorted set, then delete the set key
  if (wallets.length > 0) {
    await redis.zrem(KEYS.signalIndex(), ...wallets);
  }
  await redis.del(KEYS.signalIndex());
  console.log(`Deleted ${KEYS.signalIndex()}`);
  deleted++;

  // 5. Delete all auth session keys
  // Upstash REST API doesn't support SCAN, so we use KEYS via raw pipeline
  const sessionPattern = 'rr:v1:auth:session:*';
  const sessionKeys = await redis.keys(sessionPattern);
  console.log(`Found ${sessionKeys.length} auth session key(s).`);
  for (const key of sessionKeys) {
    await redis.del(key);
    console.log(`Deleted ${key}`);
    deleted++;
  }

  console.log(`\nDone. ${deleted} key(s) deleted.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
