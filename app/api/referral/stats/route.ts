import { NextRequest, NextResponse } from 'next/server';
import { getRefStats } from '@/lib/referral';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const code = await redis.get<string>(KEYS.refWallet(wallet));
  if (!code) {
    return NextResponse.json({ error: 'no referral code found for this wallet' }, { status: 404 });
  }

  const stats = await getRefStats(code);
  if (!stats) {
    return NextResponse.json({ error: 'referral record not found' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rektreceipt.xyz';
  const url = `${appUrl}/?ref=${code}`;

  return NextResponse.json({ code, url, ...stats });
}
