import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

function getRating(rugScore: number): string {
  if (rugScore < 10) return 'SAFE';
  if (rugScore < 30) return 'CAUTION';
  if (rugScore < 60) return 'LIKELY RUG';
  return 'RUN';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { mint: string } },
) {
  const { mint } = params;

  const [traderCount, rugCount, symbol] = await Promise.all([
    redis.zcard(`tokentraders:${mint}`),
    redis.zcard(`tokenrugs:${mint}`),
    redis.hget<string>('tokensymbols', mint),
  ]);

  const rugScore = traderCount > 0 ? Math.round((rugCount / traderCount) * 100) : 0;
  const rating = getRating(rugScore);

  return NextResponse.json({ mint, symbol: symbol ?? null, traderCount, rugCount, rugScore, rating });
}
