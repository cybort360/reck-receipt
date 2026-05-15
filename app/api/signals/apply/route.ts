import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { generalRatelimit } from '@/lib/ratelimit';
import type { SignalProvider } from '@/lib/signals';

interface StoredScore {
  score: number;
  grade: string;
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

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { wallet, name, bio, priceUsdc } = body as Record<string, unknown>;

  if (!wallet || typeof wallet !== 'string' || !wallet.trim()) {
    return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!bio || typeof bio !== 'string' || !bio.trim()) {
    return NextResponse.json({ error: 'bio is required' }, { status: 400 });
  }
  if (priceUsdc === undefined || priceUsdc === null) {
    return NextResponse.json({ error: 'priceUsdc is required' }, { status: 400 });
  }
  const price = Number(priceUsdc);
  if (!Number.isFinite(price) || price < 5 || price > 100) {
    return NextResponse.json({ error: 'priceUsdc must be between 5 and 100' }, { status: 400 });
  }

  const rawScore = await redis.get(KEYS.rektScore(wallet.trim()));
  if (!rawScore) {
    return NextResponse.json({ error: 'Minimum RektScore of 70 required' }, { status: 403 });
  }
  const storedScore: StoredScore =
    typeof rawScore === 'string' ? JSON.parse(rawScore) : (rawScore as StoredScore);

  if (storedScore.score < 70) {
    return NextResponse.json({ error: 'Minimum RektScore of 70 required' }, { status: 403 });
  }

  const provider: SignalProvider = {
    wallet: wallet.trim(),
    name: name.trim(),
    bio: bio.trim(),
    priceUsdc: price,
    rektScore: storedScore.score,
    grade: storedScore.grade,
    subscribers: 0,
    createdAt: Date.now(),
  };

  await Promise.all([
    redis.set(KEYS.signalProvider(wallet.trim()), JSON.stringify(provider)),
    redis.zadd(KEYS.signalIndex(), { score: storedScore.score, member: wallet.trim() }),
  ]);

  return NextResponse.json({ success: true });
}
