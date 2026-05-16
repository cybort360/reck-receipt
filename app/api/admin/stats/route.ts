import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  return !!secret && req.headers.get('x-admin-token') === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [wallets, providers, payoutKeys] = await Promise.all([
    redis.zcard(KEYS.auditedWallets()),
    redis.zcard(KEYS.signalIndex()),
    redis.keys('rr:v1:signal:payout:*'),
  ]);

  let pendingPayouts = 0;
  if (payoutKeys.length > 0) {
    const pipeline = redis.pipeline();
    for (const key of payoutKeys) pipeline.get(key);
    const results = await pipeline.exec<(Record<string, unknown> | string | null)[]>();
    for (const raw of results) {
      if (!raw) continue;
      const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (p.status === 'pending') pendingPayouts++;
    }
  }

  return NextResponse.json({ wallets, providers, pendingPayouts });
}
