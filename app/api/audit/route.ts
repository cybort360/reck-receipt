import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { redis } from '@/lib/redis';
import { auditRatelimit } from '@/lib/ratelimit';
import { KEYS } from '@/lib/redis/keys';
import { auditWallet } from '@/lib/auditWallet';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await auditRatelimit.limit(ip);
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

  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const bustRequested = req.nextUrl.searchParams.get('bust');
  const bust = adminSecret && req.headers.get('x-admin-secret') === adminSecret ? bustRequested : null;

  try {
    if (!bust) {
      const cached = await redis.get(KEYS.audit(wallet));
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return NextResponse.json({ ...parsed, cached: true });
      }
    }

    const { cacheObject, peerAvgLeakageUsd, peerPercentile, pnl, rektScore, isPro } =
      await auditWallet(wallet);

    return NextResponse.json({ ...cacheObject, peerAvgLeakageUsd, peerPercentile, pnl, rektScore, isPro });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Audit failed. Try again later.' }, { status: 500 });
  }
}
