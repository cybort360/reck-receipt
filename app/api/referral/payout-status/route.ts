import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  }

  const raw = await redis.get(KEYS.signalPayout(wallet.trim()));
  if (!raw) {
    return NextResponse.json({ status: null });
  }

  const record = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return NextResponse.json({ status: record.status ?? null });
}
