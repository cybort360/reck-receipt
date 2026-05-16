import { NextRequest, NextResponse } from 'next/server';
import { isAdminToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { getRefStats } from '@/lib/referral';
import type { PayoutRequest } from '../route';


export async function POST(req: NextRequest) {
  const token = req.headers.get('x-admin-token') ?? '';
  if (!(await isAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.wallet !== 'string' || !body.wallet.trim()) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  }

  const wallet = body.wallet.trim();
  const key = KEYS.signalPayout(wallet);
  const raw = await redis.get(key);
  if (!raw) {
    return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
  }

  const payout: PayoutRequest =
    typeof raw === 'string' ? JSON.parse(raw) : (raw as PayoutRequest);

  const resets: Promise<unknown>[] = [
    redis.set(key, JSON.stringify({ ...payout, status: 'paid', paidAt: Date.now() })),
  ];

  if (payout.source === 'referral') {
    const code = await redis.get<string>(KEYS.refWallet(wallet));
    if (code) {
      const record = await getRefStats(code);
      if (record) {
        const remaining = Math.max(0, record.earningsUsd - payout.amount);
        resets.push(
          redis.set(KEYS.refCode(code), JSON.stringify({ ...record, earningsUsd: remaining })),
        );
      }
    }
  } else {
    resets.push(redis.set(KEYS.providerEarnings(wallet), '0'));
  }

  await Promise.all(resets);

  return NextResponse.json({ success: true });
}
