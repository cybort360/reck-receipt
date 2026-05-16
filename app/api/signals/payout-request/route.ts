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

  let body: { providerWallet?: unknown; amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { providerWallet, amount } = body;

  if (!providerWallet || typeof providerWallet !== 'string') {
    return NextResponse.json({ error: 'providerWallet is required' }, { status: 400 });
  }
  if (session.wallet !== providerWallet) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const record: PayoutRequest = {
    wallet: providerWallet,
    amount,
    requestedAt: Date.now(),
    status: 'pending',
    source: 'signal',
  };

  await redis.set(KEYS.signalPayout(providerWallet), JSON.stringify(record));

  return NextResponse.json({ success: true });
}
