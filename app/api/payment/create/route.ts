import { NextRequest, NextResponse } from 'next/server';
import { createPaymentSession, getSolanaPayUrl } from '@/lib/payment';

export async function POST(req: NextRequest) {
  const { wallet } = await req.json();
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const { amount, expiresAt } = await createPaymentSession(wallet);
  const solanaPayUrl = getSolanaPayUrl(amount);

  return NextResponse.json({ amount, expiresAt, solanaPayUrl });
}
