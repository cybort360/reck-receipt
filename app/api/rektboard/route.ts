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
  try {
    const wallets = await redis.zrange('rektboard', 0, 19, { rev: true });

    const shareIds = await Promise.all(
      wallets.map((wallet) => redis.get<string>(`wallet:shareId:${wallet}`)),
    );

    const receipts = await Promise.all(
      shareIds.map((shareId) => shareId ? redis.get<ReceiptData>(`receipt:${shareId}`) : null),
    );

    const entries = wallets
      .map((wallet, i) => {
        const shareId = shareIds[i];
        const data = receipts[i];
        if (!shareId || !data) return null;
        return {
          shareId,
          maskedWallet: maskWallet(wallet as string),
          grade: getGrade(data.totalLeakageUsd),
          totalLeakageUsd: data.totalLeakageUsd,
          transactionCount: data.transactionCount,
        };
      })
      .filter((entry) => entry !== null);

    return NextResponse.json(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
