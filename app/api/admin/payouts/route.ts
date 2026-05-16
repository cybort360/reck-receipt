import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  return !!secret && req.headers.get('x-admin-token') === secret;
}

export interface PayoutRequest {
  wallet: string;
  amount: number;
  requestedAt: number;
  status: 'pending' | 'paid';
  paidAt?: number;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await redis.keys('rr:v1:signal:payout:*');
  if (keys.length === 0) return NextResponse.json({ payouts: [] });

  const pipeline = redis.pipeline();
  for (const key of keys) pipeline.get(key);
  const results = await pipeline.exec<(PayoutRequest | string | null)[]>();

  const payouts: PayoutRequest[] = results
    .map((raw) => {
      if (!raw) return null;
      return typeof raw === 'string' ? (JSON.parse(raw) as PayoutRequest) : (raw as PayoutRequest);
    })
    .filter((p): p is PayoutRequest => p !== null);

  payouts.sort((a, b) => a.requestedAt - b.requestedAt);

  return NextResponse.json({ payouts });
}
