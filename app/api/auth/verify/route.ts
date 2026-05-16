import { NextRequest, NextResponse } from 'next/server';
import { consumeNonce, verifySignature, createSession } from '@/lib/auth';
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
  const signature = typeof body?.signature === 'string' ? body.signature.trim() : '';

  if (!wallet) {
    return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
  }
  if (!signature) {
    return NextResponse.json({ error: 'signature is required' }, { status: 400 });
  }

  const nonce = await consumeNonce(wallet);
  if (!nonce) {
    return NextResponse.json({ error: 'Nonce expired. Request a new one.' }, { status: 400 });
  }

  const valid = verifySignature(wallet, nonce, signature);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const token = await createSession(wallet);
  return NextResponse.json({ token });
}
