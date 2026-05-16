import { NextRequest, NextResponse } from 'next/server';
import { isAdminToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';


export async function GET(req: NextRequest) {
  const token = req.headers.get('x-admin-token') ?? '';
  if (!(await isAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('auditedWallets key:', KEYS.auditedWallets());

  const [walletsAudited, totalProviders, activeSubscriptions, payoutKeys] = await Promise.all([
    redis.zcard(KEYS.auditedWallets()),
    redis.zcard(KEYS.signalIndex()),
    redis.scard(KEYS.subscriptionIndex()),
    redis.keys('rr:v1:signal:payout:*'),
  ]);

  console.log('auditedWallets count:', walletsAudited);

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

  return NextResponse.json({ walletsAudited, totalProviders, activeSubscriptions, pendingPayouts });
}
