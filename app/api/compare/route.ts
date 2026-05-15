import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

interface CachedAudit {
  totalLeakageUsd: number;
  transactionCount: number;
  personality: { title: string; description: string; emoji: string } | null;
  deadTokens: unknown[];
  overtrading: { totalOvertradingFeesUsd: number } | null;
}

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

function shape(wallet: string, cache: CachedAudit) {
  return {
    maskedWallet: maskWallet(wallet),
    grade: getGrade(cache.totalLeakageUsd),
    totalLeakageUsd: cache.totalLeakageUsd,
    transactionCount: cache.transactionCount,
    personality: cache.personality ?? null,
    deadTokensCount: cache.deadTokens?.length ?? 0,
    overtradingFeesUsd: cache.overtrading?.totalOvertradingFeesUsd ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const wallet1 = req.nextUrl.searchParams.get('wallet1');
  const wallet2 = req.nextUrl.searchParams.get('wallet2');

  if (!wallet1 || !wallet2) {
    return NextResponse.json({ error: 'wallet1 and wallet2 are required' }, { status: 400 });
  }

  const [cache1, cache2] = await Promise.all([
    redis.get<CachedAudit>(KEYS.audit(wallet1)),
    redis.get<CachedAudit>(KEYS.audit(wallet2)),
  ]);

  if (!cache1 && !cache2) {
    return NextResponse.json({ error: 'both wallets not found — run an audit first' }, { status: 404 });
  }
  if (!cache1) {
    return NextResponse.json({ error: `wallet1 (${wallet1}) not found — run an audit first` }, { status: 404 });
  }
  if (!cache2) {
    return NextResponse.json({ error: `wallet2 (${wallet2}) not found — run an audit first` }, { status: 404 });
  }

  return NextResponse.json({
    wallet1: shape(wallet1, cache1),
    wallet2: shape(wallet2, cache2),
  });
}
