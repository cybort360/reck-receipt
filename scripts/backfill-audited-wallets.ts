import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { redis } from '../lib/redis';
import { KEYS } from '../lib/redis/keys';

async function main() {
  const wallets = await redis.zrange(KEYS.lbGlobal(), 0, -1);
  console.log(`Found ${wallets.length} wallets in lbGlobal`);

  if (wallets.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  const now = Date.now();
  const pipeline = redis.pipeline();
  for (const w of wallets) {
    pipeline.zadd(KEYS.auditedWallets(), { score: now, member: w as string });
  }
  await pipeline.exec();
  console.log(`Backfilled ${wallets.length} wallets into ${KEYS.auditedWallets()}`);

  const count = await redis.zcard(KEYS.auditedWallets());
  console.log(`auditedWallets count now: ${count}`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
