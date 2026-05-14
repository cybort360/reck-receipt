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
  await redis.set(`receipt:${shareId}`, JSON.stringify({ wallet, ...summary }), { ex: 604800 });

  return NextResponse.json({ wallet, ...summary, shareId });
}
