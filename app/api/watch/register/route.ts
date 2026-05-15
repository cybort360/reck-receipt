import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getProStatus } from '@/lib/pro';

export async function POST(req: NextRequest) {
  const { wallet, email, telegramChatId } = await req.json();

  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
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
    redis.set(`watch:${wallet}`, JSON.stringify(config)),
    redis.sadd('watched-wallets', wallet),
  ]);

  return NextResponse.json({ success: true });
}
