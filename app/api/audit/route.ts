import { NextRequest, NextResponse } from 'next/server';
import { fetchSwapTransactions } from '@/lib/helius';
import { calculateLeakage, calculateTokenBreakdown } from '@/lib/fees';
import { getTokenMetadata } from '@/lib/tokens';
import { getSolPriceAtTimestamp } from '@/lib/price';
import { redis } from '@/lib/redis';

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateId(): string {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function calculateGrade(usd: number): string {
  if (usd < 1) return 'A';
  if (usd < 5) return 'B';
  if (usd < 20) return 'C';
  if (usd < 50) return 'D';
  return 'F';
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const txs = await fetchSwapTransactions(wallet);

  const mints = [...new Set(txs.flatMap((tx) => tx.tokenTransfers.map((t) => t.mint)).filter(Boolean))];
  const [summary, tokenMetadata] = await Promise.all([
    calculateLeakage(txs),
    getTokenMetadata(mints),
  ]);

  const solPricesByDate = new Map<string, number>();
  await Promise.all(
    txs.map(async (tx) => {
      const d = new Date(tx.timestamp * 1000);
      const key = `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
      if (!solPricesByDate.has(key)) {
        solPricesByDate.set(key, await getSolPriceAtTimestamp(tx.timestamp * 1000));
      }
    }),
  );

  const tokenBreakdown = calculateTokenBreakdown(txs, tokenMetadata, solPricesByDate);

  const shareId = generateId();
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const weekKey = `rektboard:week:${week}`;
  const historyKey = `history:${wallet}`;
  const historyEntry = JSON.stringify({
    timestamp: Date.now(),
    totalLeakageUsd: summary.totalLeakageUsd,
    totalFeesSol: summary.totalFeesSol,
    totalJitoTipsSol: summary.totalJitoTipsSol,
    transactionCount: summary.transactionCount,
    grade: calculateGrade(summary.totalLeakageUsd),
    shareId,
  });

  await Promise.all([
    redis.set(`receipt:${shareId}`, JSON.stringify({ wallet, ...summary }), { ex: 604800 }),
    redis.set(`wallet:shareId:${wallet}`, shareId),
    redis.zadd('rektboard', { score: summary.totalLeakageUsd, member: wallet }),
    redis.zadd(weekKey, { score: summary.totalLeakageUsd, member: wallet }),
    redis.expire(weekKey, 1209600),
  ]);

  try {
    await redis.lpush(historyKey, historyEntry);
    await redis.ltrim(historyKey, 0, 29);
  } catch (err) {
    // non-fatal: history write failure should not break the audit response
    void err;
  }

  return NextResponse.json({ wallet, ...summary, shareId, tokenBreakdown });
}
