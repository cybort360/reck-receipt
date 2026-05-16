import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { generalRatelimit } from '@/lib/ratelimit';
import { getSession } from '@/lib/auth';

interface PayoutRequest {
  wallet: string;
  amount: number;
  requestedAt: number;
  status: 'pending';
  source: 'signal';
}

export async function POST(req: NextRequest) {
  const sessionToken = req.headers.get('x-session-token') ?? '';
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await getSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await generalRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 });
  }

  let body: { providerWallet?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { providerWallet } = body;

  if (!providerWallet || typeof providerWallet !== 'string') {
    return NextResponse.json({ error: 'providerWallet is required' }, { status: 400 });
  }
  if (session.wallet !== providerWallet) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawEarnings = await redis.get<string>(KEYS.providerEarnings(providerWallet));
  const amount = parseFloat(rawEarnings ?? '0');
  if (amount < 10) {
    return NextResponse.json(
      { error: `Minimum payout is $10. Current balance: $${amount.toFixed(2)}` },
      { status: 400 },
    );
  }

  const existing = await redis.get(KEYS.signalPayout(providerWallet));
  if (existing) {
    const prev = typeof existing === 'string' ? JSON.parse(existing) : existing;
    if (prev.status === 'pending') {
      return NextResponse.json({ error: 'A payout request is already pending' }, { status: 409 });
    }
  }

  const record: PayoutRequest = {
    wallet: providerWallet,
    amount,
    requestedAt: Date.now(),
    status: 'pending',
    source: 'signal',
  };

  await redis.set(KEYS.signalPayout(providerWallet), JSON.stringify(record));

  return NextResponse.json({ success: true, amount });
}
