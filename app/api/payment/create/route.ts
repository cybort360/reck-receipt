import { NextRequest, NextResponse } from 'next/server';
import { createPaymentSession, getSolanaPayUrl } from '@/lib/payment';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { wallet, plan } = body as { wallet?: string; plan?: string };
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const resolvedPlan: 'pro' | 'signals' = plan === 'signals' ? 'signals' : 'pro';
  const { amount, expiresAt } = await createPaymentSession(wallet, resolvedPlan);
  const solanaPayUrl = getSolanaPayUrl(amount);

  return NextResponse.json({ amount, expiresAt, solanaPayUrl });
}
