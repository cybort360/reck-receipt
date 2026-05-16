import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

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

  await Promise.all([
    redis.del(KEYS.signalProvider(wallet)),
    redis.zrem(KEYS.signalIndex(), wallet),
    redis.del(KEYS.signalCalls(wallet)),
  ]);

  return NextResponse.json({ success: true });
}
