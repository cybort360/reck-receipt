import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

interface CachedAudit {
  totalLeakageUsd: number;
  transactionCount: number;
  personality: { title: string; description: string; emoji: string };
}

const GRADE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, F: 4 };

function getGrade(totalLeakageUsd: number): string {
  if (totalLeakageUsd < 1) return 'A';
  if (totalLeakageUsd < 5) return 'B';
  if (totalLeakageUsd < 20) return 'C';
  if (totalLeakageUsd < 50) return 'D';
  return 'F';
}

function maskWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export async function GET() {
  const raw = await redis.zrange('rektboard', 0, 19, { withScores: true });

  const entries: { wallet: string; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ wallet: raw[i] as string, score: Number(raw[i + 1]) });
  }

  const caches = await Promise.all(
    entries.map((e) => redis.get<CachedAudit>(`cache:${e.wallet}`)),
  );

  const results = entries
    .map((e, i) => ({ wallet: e.wallet, cache: caches[i] }))
    .filter(
      (row): row is { wallet: string; cache: CachedAudit } =>
        row.cache !== null && row.cache.transactionCount >= 10,
    )
    .map(({ wallet, cache }) => ({
      wallet,
      maskedWallet: maskWallet(wallet),
      grade: getGrade(cache.totalLeakageUsd),
      totalLeakageUsd: cache.totalLeakageUsd,
      transactionCount: cache.transactionCount,
      personality: cache.personality ?? null,
    }))
    .sort((a, b) => {
      const gradeDiff = (GRADE_ORDER[a.grade] ?? 4) - (GRADE_ORDER[b.grade] ?? 4);
      if (gradeDiff !== 0) return gradeDiff;
      return a.totalLeakageUsd - b.totalLeakageUsd;
    });

  return NextResponse.json(results);
}
