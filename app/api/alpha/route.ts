import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

interface CachedAudit {
  totalLeakageUsd: number;
  efficiencyScore?: number;
  efficiencyLabel?: string;
  tokenBreakdown: { mint: string; symbol: string; swapCount: number }[];
}

function getEfficiencyLabel(score: number): string {
  if (score >= 85) return 'Elite';
  if (score >= 70) return 'Sharp';
  if (score >= 50) return 'Average';
  return 'Sloppy';
}

export async function GET() {
  // lbGlobal is populated on every audit; auditedWallets is never written
  const wallets = (await redis.zrange(KEYS.lbGlobal(), 0, -1)) as string[];
  console.log('[alpha] wallets from lbGlobal:', wallets.length, wallets.slice(0, 5));

  const caches = await Promise.all(
    wallets.map((w) => redis.get<CachedAudit>(KEYS.audit(w))),
  );
  console.log('[alpha] audit cache hits:', caches.filter(Boolean).length, '/', wallets.length);

  // Threshold lowered to 1 so any indexed token appears
  const alphaWallets = caches.filter(
    (c): c is CachedAudit => c !== null && (c.efficiencyScore ?? 0) >= 1,
  );
  console.log('[alpha] alpha wallets after filter:', alphaWallets.length);

  const mintMap = new Map<
    string,
    { symbol: string; walletCount: number; totalSwaps: number; totalEfficiency: number }
  >();

  for (const wallet of alphaWallets) {
    const score = wallet.efficiencyScore ?? 70;
    for (const token of wallet.tokenBreakdown ?? []) {
      const existing = mintMap.get(token.mint);
      if (existing) {
        existing.walletCount += 1;
        existing.totalSwaps += token.swapCount;
        existing.totalEfficiency += score;
      } else {
        mintMap.set(token.mint, {
          symbol: token.symbol,
          walletCount: 1,
          totalSwaps: token.swapCount,
          totalEfficiency: score,
        });
      }
    }
  }

  const top10 = [...mintMap.entries()]
    .map(([mint, data]) => {
      const avgEfficiencyScore = Math.round(data.totalEfficiency / data.walletCount);
      return {
        mint,
        symbol: data.symbol,
        alphaWalletCount: data.walletCount,
        avgSwaps: Math.round((data.totalSwaps / data.walletCount) * 10) / 10,
        avgEfficiencyScore,
        efficiencyLabel: getEfficiencyLabel(avgEfficiencyScore),
      };
    })
    .sort((a, b) => b.avgEfficiencyScore - a.avgEfficiencyScore)
    .slice(0, 10);

  console.log('[alpha] mintMap size:', mintMap.size, '| top10:', JSON.stringify(top10.map(t => t.symbol)));
  return NextResponse.json(top10);
}
