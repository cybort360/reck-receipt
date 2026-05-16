import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { generalRatelimit } from '@/lib/ratelimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await generalRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.wallet !== 'string' || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'wallet and email required' }, { status: 400 });
  }

  const wallet = body.wallet.trim();
  const email = body.email.trim().toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  await redis.set(KEYS.userEmail(wallet), email);

  return NextResponse.json({ success: true });
}
