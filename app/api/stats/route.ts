import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import type { LeakageSummary } from '@/lib/fees';

interface ReceiptData extends LeakageSummary {
  wallet: string;
}

function getGrade(usd: number): string {
  if (usd < 1) return 'A';
  if (usd < 5) return 'B';
  if (usd < 20) return 'C';
  if (usd < 50) return 'D';
  return 'F';
}

function maskWallet(address: string): string {
  return `${address.slice(0, 1)}••••••••••••`;
}

export async function GET() {
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const weekKey = `rektboard:week:${week}`;

  const results = await redis.zrange(weekKey, 0, 0, { rev: true, withScores: true });

  if (!results || results.length === 0) {
    return NextResponse.json({ topLeakageUsd: 0 });
  }

  const topWallet = results[0] as string;
  const topLeakageUsd = results[1] as number;

  const shareId = await redis.get<string>(KEYS.shareByWallet(topWallet));

  if (!shareId) {
    return NextResponse.json({ topLeakageUsd: 0 });
  }

  const data = await redis.get<ReceiptData>(`receipt:${shareId}`);
  if (!data) {
    return NextResponse.json({ topLeakageUsd: 0 });
  }

  return NextResponse.json({
    topLeakageUsd,
    topGrade: getGrade(topLeakageUsd),
    topMaskedWallet: maskWallet(data.wallet),
    shareId,
  });
}
