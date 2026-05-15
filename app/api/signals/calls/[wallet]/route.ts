import { NextRequest, NextResponse } from 'next/server';
import { getSignalCalls } from '@/lib/signals';
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
  const calls = await getSignalCalls(wallet, 20);
  return NextResponse.json(calls);
}
