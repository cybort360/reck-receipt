import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { getRefStats } from '@/lib/referral';
import { getSession } from '@/lib/auth';

const MIN_PAYOUT_USD = 10;

export async function POST(req: NextRequest) {
  const sessionToken = req.headers.get('x-session-token') ?? '';
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await getSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.wallet !== 'string' || !body.wallet.trim()) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  }

  const wallet = body.wallet.trim();

  if (session.wallet !== wallet) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const code = await redis.get<string>(KEYS.refWallet(wallet));
  if (!code) {
    return NextResponse.json({ error: 'no referral code found for this wallet' }, { status: 404 });
  }

  const stats = await getRefStats(code);
  if (!stats) {
    return NextResponse.json({ error: 'referral record not found' }, { status: 404 });
  }

  if (stats.earningsUsd < MIN_PAYOUT_USD) {
    return NextResponse.json(
      { error: `Minimum payout is $${MIN_PAYOUT_USD}. Current balance: $${stats.earningsUsd.toFixed(2)}` },
      { status: 400 },
    );
  }

  const existing = await redis.get(KEYS.signalPayout(wallet));
  if (existing) {
    const record = typeof existing === 'string' ? JSON.parse(existing) : existing;
    if (record.status === 'pending') {
      return NextResponse.json({ error: 'A payout request is already pending' }, { status: 409 });
    }
  }

  await redis.set(
    KEYS.signalPayout(wallet),
    JSON.stringify({ wallet, amount: stats.earningsUsd, requestedAt: Date.now(), status: 'pending', source: 'referral' }),
  );

  return NextResponse.json({ success: true, amount: stats.earningsUsd });
}
