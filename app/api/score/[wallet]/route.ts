import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { generalRatelimit } from '@/lib/ratelimit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> },
) {
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

  const { wallet } = await params;
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const stored = await redis.get(KEYS.rektScore(wallet));
  if (!stored) {
    return NextResponse.json(
      { error: 'No audit found for this wallet' },
      { status: 404 },
    );
  }

  const score = typeof stored === 'string' ? JSON.parse(stored) : stored;

  return NextResponse.json(score, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
