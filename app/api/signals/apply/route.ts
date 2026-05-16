import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { generalRatelimit } from '@/lib/ratelimit';
import { getSession } from '@/lib/auth';
import type { SignalProvider } from '@/lib/signals';

interface StoredAudit {
  efficiencyScore?: number;
  transactionCount?: number;
  grade?: string;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await generalRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 });
  }

  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet || !wallet.trim()) {
    return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
  }

  const rawAudit = await redis.get(KEYS.audit(wallet.trim()));
  if (!rawAudit) {
    return NextResponse.json({ error: 'No audit found. Run an audit first.' }, { status: 404 });
  }
  const audit: StoredAudit =
    typeof rawAudit === 'string' ? JSON.parse(rawAudit) : (rawAudit as StoredAudit);

  return NextResponse.json({
    efficiencyScore: audit.efficiencyScore ?? null,
    swapCount: audit.transactionCount ?? 0,
  });
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

  const { wallet, name, bio, priceUsdc } = body as Record<string, unknown>;

  if (!wallet || typeof wallet !== 'string' || !wallet.trim()) {
    return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
  }

  const session = await getSession(sessionToken);
  if (!session || session.wallet !== wallet.trim()) {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
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

  const rawAudit = await redis.get(KEYS.audit(wallet.trim()));
  if (!rawAudit) {
    return NextResponse.json({ error: 'No audit found for this wallet. Run an audit first.' }, { status: 403 });
  }
  const audit: StoredAudit =
    typeof rawAudit === 'string' ? JSON.parse(rawAudit) : (rawAudit as StoredAudit);

  if (audit.efficiencyScore == null) {
    return NextResponse.json(
      { error: 'Re-audit your wallet to generate an updated efficiency score.' },
      { status: 403 },
    );
  }

  if (audit.efficiencyScore < 65) {
    return NextResponse.json(
      { error: `Efficiency score of ${audit.efficiencyScore} does not meet the minimum of 65.` },
      { status: 403 },
    );
  }

  const swapCount = audit.transactionCount ?? 0;
  if (swapCount < 20) {
    return NextResponse.json(
      { error: `Only ${swapCount} swaps analyzed. Minimum 20 required.` },
      { status: 403 },
    );
  }

  const rektScore = audit.efficiencyScore;
  const grade = audit.grade ?? 'N/A';

  const provider: SignalProvider = {
    wallet: wallet.trim(),
    name: name.trim(),
    bio: bio.trim(),
    priceUsdc: price,
    rektScore,
    grade,
    subscribers: 0,
    createdAt: Date.now(),
  };

  await Promise.all([
    redis.set(KEYS.signalProvider(wallet.trim()), JSON.stringify(provider)),
    redis.zadd(KEYS.signalIndex(), { score: rektScore, member: wallet.trim() }),
  ]);

  return NextResponse.json({ success: true });
}
