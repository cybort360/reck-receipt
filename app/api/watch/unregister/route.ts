import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const sessionToken = req.headers.get('x-session-token') ?? '';
  const session = await getSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { wallet } = await req.json();

  if (!wallet || session.wallet !== wallet) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await Promise.all([
    redis.del(KEYS.userWatch(wallet)),
    redis.srem('watched-wallets', wallet),
  ]);

  return NextResponse.json({ success: true });
}
