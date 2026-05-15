import { NextRequest, NextResponse } from 'next/server';
import { getSubscription } from '@/lib/subscription';
import { generalRatelimit } from '@/lib/ratelimit';

export async function GET(req: NextRequest) {
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

  const subscriber = req.nextUrl.searchParams.get('subscriber');
  const provider = req.nextUrl.searchParams.get('provider');

  if (!subscriber || !provider) {
    return NextResponse.json({ error: 'subscriber and provider are required' }, { status: 400 });
  }

  const subscription = await getSubscription(subscriber, provider);
  return NextResponse.json({ hasAccess: subscription !== null });
}
