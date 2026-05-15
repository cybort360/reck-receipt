import { NextRequest, NextResponse } from 'next/server';
import { getProviderEarnings } from '@/lib/subscription';
import { generalRatelimit } from '@/lib/ratelimit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> },
) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await generalRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 });
  }

  const { wallet } = await params;
  if (!wallet) {
    return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
  }

  const earnings = await getProviderEarnings(wallet);
  return NextResponse.json({ earnings });
}
