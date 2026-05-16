import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { redis } from '@/lib/redis';
import { postSignalCall, getSignalProvider, getSignalCalls, updateSignalCall } from '@/lib/signals';
import type { SignalCall } from '@/lib/signals';
import { generalRatelimit } from '@/lib/ratelimit';
import { getSession } from '@/lib/auth';
import { notifyNewSignal } from '@/lib/telegram';

interface JupPriceResponse {
  data: Record<string, { id: string; type: string; price: string } | null>;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await generalRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
        },
      },
    );
  }

  const sessionToken = req.headers.get('x-session-token') ?? '';
  if (!sessionToken) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { wallet, mint, direction, entryPrice, note } = body as Record<string, unknown>;

  if (!wallet || typeof wallet !== 'string' || !wallet.trim()) {
    return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
  }

  const session = await getSession(sessionToken);
  if (!session || session.wallet !== wallet.trim()) {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
  }
  if (!mint || typeof mint !== 'string' || !mint.trim()) {
    return NextResponse.json({ error: 'mint is required' }, { status: 400 });
  }
  if (direction !== 'buy' && direction !== 'sell') {
    return NextResponse.json({ error: 'direction must be buy or sell' }, { status: 400 });
  }
  const entry = Number(entryPrice);
  if (!Number.isFinite(entry) || entry <= 0) {
    return NextResponse.json({ error: 'entryPrice must be a positive number' }, { status: 400 });
  }
  if (typeof note !== 'string') {
    return NextResponse.json({ error: 'note is required' }, { status: 400 });
  }

  const provider = await getSignalProvider(wallet.trim());
  if (!provider) {
    return NextResponse.json({ error: 'Not a registered signal provider' }, { status: 403 });
  }

  try {
    // If this is a SELL, find and close the matching open BUY for the same mint
    let closedBuyId: string | null = null;
    if (direction === 'sell') {
      const existingCalls = await getSignalCalls(wallet.trim(), 100);
      const matchingBuy = existingCalls.find(
        (c) =>
          c.mint === mint.trim() &&
          c.direction === 'buy' &&
          (c.status ?? 'open') === 'open',
      );
      if (matchingBuy) {
        const finalPnlPercent =
          matchingBuy.entryPrice > 0
            ? ((entry - matchingBuy.entryPrice) / matchingBuy.entryPrice) * 100
            : 0;
        await updateSignalCall(wallet.trim(), matchingBuy.id, {
          status: 'closed',
          closedAt: Date.now(),
          closedPrice: entry,
          finalPnlPercent,
        });
        closedBuyId = matchingBuy.id;
      }
    }

    // Fetch current price and symbol in parallel
    const [jupRes, storedSymbol] = await Promise.all([
      fetch(`https://api.jup.ag/price/v2?ids=${encodeURIComponent(mint.trim())}`).catch(() => null),
      redis.hget<string>('tokensymbols', mint.trim()),
    ]);

    let currentPrice = entry;
    if (jupRes?.ok) {
      const jupData: JupPriceResponse = await jupRes.json();
      const priceStr = jupData.data[mint.trim()]?.price;
      if (priceStr) currentPrice = parseFloat(priceStr);
    }

    const symbol = storedSymbol ?? mint.trim().slice(0, 6).toUpperCase();

    const call: SignalCall = {
      id: crypto.randomUUID(),
      providerWallet: wallet.trim(),
      mint: mint.trim(),
      symbol,
      direction: direction as 'buy' | 'sell',
      entryPrice: entry,
      currentPrice,
      note: note.trim(),
      timestamp: Date.now(),
      status: 'open',
    };

    await postSignalCall(wallet.trim(), call);

    try {
      await notifyNewSignal(wallet.trim(), provider.name, call.symbol, call.direction, call.note);
    } catch {
      // Telegram failure must never break signal posting
    }

    return NextResponse.json({ success: true, call, closedBuyId });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to post signal. Try again later.' }, { status: 500 });
  }
}
