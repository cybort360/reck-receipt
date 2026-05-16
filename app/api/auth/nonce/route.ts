import { NextRequest, NextResponse } from 'next/server';
import { generateNonce, storeNonce } from '@/lib/auth';
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
  const wallet = typeof body?.wallet === 'string' ? body.wallet.trim() : '';
  if (!wallet) {
    return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
  }

  const nonce = generateNonce();
  await storeNonce(wallet, nonce);

  return NextResponse.json({ nonce, message: `Sign in to RektReceipt: ${nonce}` });
}
