import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

function getRating(rugScore: number): string {
  if (rugScore < 10) return 'SAFE';
  if (rugScore < 30) return 'CAUTION';
  if (rugScore < 60) return 'LIKELY RUG';
  return 'RUN';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mint: string }> },
) {
  const { mint } = await params;

  const [traderCount, rugCount, symbol] = await Promise.all([
    redis.zcard(KEYS.tokenTraders(mint)),
    redis.zcard(KEYS.tokenRugs(mint)),
    redis.hget<string>('tokensymbols', mint),
  ]);

  const rugScore = traderCount > 0 ? Math.round((rugCount / traderCount) * 100) : 0;
  const rating = getRating(rugScore);

  return NextResponse.json({ mint, symbol: symbol ?? null, traderCount, rugCount, rugScore, rating });
}
