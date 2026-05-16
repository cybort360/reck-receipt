import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { getProStatus } from '@/lib/pro';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const sessionToken = req.headers.get('x-session-token') ?? '';
  const session = await getSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { wallet, email, telegramChatId } = await req.json();

  if (!wallet || session.wallet !== wallet) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const proStatus = await getProStatus(wallet);
  if (!proStatus.isPro) {
    return NextResponse.json({ error: 'Pro required' }, { status: 403 });
  }

  if (!email && !telegramChatId) {
    return NextResponse.json({ error: 'email or telegramChatId required' }, { status: 400 });
  }

  const config = { wallet, email: email ?? null, telegramChatId: telegramChatId ?? null, registeredAt: Date.now() };

  await Promise.all([
    redis.set(KEYS.userWatch(wallet), JSON.stringify(config)),
    redis.sadd('watched-wallets', wallet),
  ]);

  return NextResponse.json({ success: true });
}
