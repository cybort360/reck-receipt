import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
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
  const shareIds = await redis.zrange('rektboard', 0, 19, { rev: true });

  const receipts = await Promise.all(
    shareIds.map((id) => redis.get<ReceiptData>(`receipt:${id}`)),
  );

  const entries = shareIds
    .map((shareId, i) => {
      const data = receipts[i];
      if (!data) return null;
      return {
        shareId,
        maskedWallet: maskWallet(data.wallet),
        grade: getGrade(data.totalLeakageUsd),
        totalLeakageUsd: data.totalLeakageUsd,
        transactionCount: data.transactionCount,
      };
    })
    .filter((entry) => entry !== null);

  return NextResponse.json(entries);
}
