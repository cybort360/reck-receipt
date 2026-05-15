import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

interface CachedAudit {
  totalLeakageUsd: number;
  tokenBreakdown: { mint: string; symbol: string; swapCount: number }[];
}

function getGrade(totalLeakageUsd: number): string {
  if (totalLeakageUsd < 1) return 'A';
  if (totalLeakageUsd < 5) return 'B';
  if (totalLeakageUsd < 20) return 'C';
  if (totalLeakageUsd < 50) return 'D';
  return 'F';
}

export async function GET() {
  const wallets = (await redis.zrange('rektboard', 0, 9)) as string[];

  const caches = await Promise.all(
    wallets.map((w) => redis.get<CachedAudit>(`cache:${w}`)),
  );

  const alphaWallets = caches.filter(
    (c): c is CachedAudit =>
      c !== null && getGrade(c.totalLeakageUsd) === 'A',
  );

  const mintMap = new Map<
    string,
    { symbol: string; walletCount: number; totalSwaps: number }
  >();

  for (const wallet of alphaWallets) {
    for (const token of wallet.tokenBreakdown ?? []) {
      const existing = mintMap.get(token.mint);
      if (existing) {
        existing.walletCount += 1;
        existing.totalSwaps += token.swapCount;
      } else {
        mintMap.set(token.mint, {
          symbol: token.symbol,
          walletCount: 1,
          totalSwaps: token.swapCount,
        });
      }
    }
  }

  const top10 = [...mintMap.entries()]
    .map(([mint, data]) => ({
      mint,
      symbol: data.symbol,
      alphaWalletCount: data.walletCount,
      avgSwaps: Math.round((data.totalSwaps / data.walletCount) * 10) / 10,
    }))
    .sort((a, b) => b.alphaWalletCount - a.alphaWalletCount)
    .slice(0, 10);

  return NextResponse.json(top10);
}
