import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import type { PayoutRequest } from '../route';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  return !!secret && req.headers.get('x-admin-token') === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.wallet !== 'string' || !body.wallet.trim()) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  }

  const wallet = body.wallet.trim();
  const key = KEYS.signalPayout(wallet);
  const raw = await redis.get(key);
  if (!raw) {
    return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
  }

  const payout: PayoutRequest =
    typeof raw === 'string' ? JSON.parse(raw) : (raw as PayoutRequest);

  await Promise.all([
    redis.set(key, JSON.stringify({ ...payout, status: 'paid', paidAt: Date.now() })),
    redis.set(KEYS.providerEarnings(wallet), '0'),
  ]);

  return NextResponse.json({ success: true });
}
