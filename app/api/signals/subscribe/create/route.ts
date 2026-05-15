import { NextRequest, NextResponse } from 'next/server';
import { getSignalProvider } from '@/lib/signals';
import { createSubscriptionSession } from '@/lib/subscription';
import { generalRatelimit } from '@/lib/ratelimit';

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

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { subscriberWallet, providerWallet } = body as Record<string, unknown>;

  if (!subscriberWallet || typeof subscriberWallet !== 'string' || !subscriberWallet.trim()) {
    return NextResponse.json({ error: 'subscriberWallet is required' }, { status: 400 });
  }
  if (!providerWallet || typeof providerWallet !== 'string' || !providerWallet.trim()) {
    return NextResponse.json({ error: 'providerWallet is required' }, { status: 400 });
  }
  if (subscriberWallet.trim() === providerWallet.trim()) {
    return NextResponse.json({ error: 'Cannot subscribe to yourself' }, { status: 400 });
  }

  const provider = await getSignalProvider(providerWallet.trim());
  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  const amount = await createSubscriptionSession(
    subscriberWallet.trim(),
    providerWallet.trim(),
    provider.priceUsdc,
  );

  const treasuryWallet = process.env.TREASURY_WALLET ?? '';
  const usdcMint = process.env.USDC_MINT ?? '';
  const label = encodeURIComponent(`Subscribe to ${provider.name}`);
  const message = encodeURIComponent('RektReceipt Signal Subscription');
  const solanaPayUrl = `solana:${treasuryWallet}?amount=${amount}&spl-token=${usdcMint}&label=${label}&message=${message}`;

  return NextResponse.json({ amount, solanaPayUrl, treasuryWallet });
}
