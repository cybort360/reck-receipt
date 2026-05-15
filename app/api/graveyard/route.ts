import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  const results = await redis.zrange('graveyard', 0, 19, { rev: true, withScores: true });

  // zrange with withScores returns [member, score, member, score, ...]
  const entries: { mint: string; rugCount: number }[] = [];
  for (let i = 0; i < results.length; i += 2) {
    entries.push({ mint: results[i] as string, rugCount: Number(results[i + 1]) });
  }

  const symbols = await Promise.all(
    entries.map((e) => redis.hget<string>('tokensymbols', e.mint)),
  );

  const payload = entries.map((e, i) => ({
    mint: e.mint,
    symbol: symbols[i] ?? null,
    rugCount: e.rugCount,
  }));

  return NextResponse.json(payload);
}
