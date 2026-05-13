import { NextRequest, NextResponse } from 'next/server';
import { fetchSwapTransactions } from '@/lib/helius';
import { calculateLeakage } from '@/lib/fees';
import { getSolPrice } from '@/lib/price';

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

  return NextResponse.json({ wallet, ...summary });
}
