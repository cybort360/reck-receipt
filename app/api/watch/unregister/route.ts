import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const { wallet } = await req.json();

  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  await Promise.all([
    redis.del(`watch:${wallet}`),
    redis.srem('watched-wallets', wallet),
  ]);

  return NextResponse.json({ success: true });
}
