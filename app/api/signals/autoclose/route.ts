import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { getSignalCalls, updateSignalCall } from '@/lib/signals';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const wallets = (await redis.zrange(KEYS.signalIndex(), 0, -1)) as string[];

  let totalClosed = 0;
  const failed: string[] = [];

  for (const wallet of wallets) {
    try {
      const calls = await getSignalCalls(wallet, 100);
      const stale = calls.filter(
        (c) =>
          c.direction === 'buy' &&
          (c.status ?? 'open') === 'open' &&
          c.timestamp < cutoff,
      );

      if (stale.length === 0) continue;

      // Batch Jupiter price fetch for all unique mints
      const mints = [...new Set(stale.map((c) => c.mint))];
      const prices: Record<string, number> = {};

      const priceRes = await fetch(
        `https://api.jup.ag/price/v2?ids=${mints.map(encodeURIComponent).join(',')}`,
      ).catch(() => null);

      if (priceRes?.ok) {
        const data = (await priceRes.json()) as {
          data: Record<string, { price: string } | null>;
        };
        for (const [mint, info] of Object.entries(data.data)) {
          if (info?.price) prices[mint] = parseFloat(info.price);
        }
      }

      for (const call of stale) {
        const closedPrice = prices[call.mint] ?? call.currentPrice;
        const finalPnlPercent =
          call.entryPrice > 0
            ? ((closedPrice - call.entryPrice) / call.entryPrice) * 100
            : 0;
        await updateSignalCall(wallet, call.id, {
          status: 'closed',
          closedAt: Date.now(),
          closedPrice,
          finalPnlPercent,
        });
        totalClosed++;
      }
    } catch {
      failed.push(wallet);
    }
  }

  return NextResponse.json({ closed: totalClosed, failed, providers: wallets.length });
}
