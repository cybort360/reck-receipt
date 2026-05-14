import { NextRequest, NextResponse } from 'next/server';
import { fetchSwapTransactions } from '@/lib/helius';
import { calculateLeakage } from '@/lib/fees';
import { getSolPrice } from '@/lib/price';
import { redis } from '@/lib/redis';

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateId(): string {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const [txs, solPriceUsd] = await Promise.all([
    fetchSwapTransactions(wallet),
    getSolPrice(),
  ]);

  const summary = calculateLeakage(txs, solPriceUsd);

  const shareId = generateId();
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const weekKey = `rektboard:week:${week}`;
  console.log('[audit] week:', week, '| weekKey:', weekKey);
  console.log('[audit] zadd rektboard', { score: summary.totalLeakageUsd, member: wallet });
  console.log('[audit] zadd', weekKey, { score: summary.totalLeakageUsd, member: wallet });
  await Promise.all([
    redis.set(`receipt:${shareId}`, JSON.stringify({ wallet, ...summary }), { ex: 604800 }),
    redis.set(`wallet:shareId:${wallet}`, shareId),
    redis.zadd('rektboard', { score: summary.totalLeakageUsd, member: wallet }),
    redis.zadd(weekKey, { score: summary.totalLeakageUsd, member: wallet }),
    redis.expire(weekKey, 1209600),
  ]);

  return NextResponse.json({ wallet, ...summary, shareId });
}
