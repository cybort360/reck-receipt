import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { verifyAndGrantSubscription } from '@/lib/subscription';
import { sendPaymentConfirmation } from '@/lib/email';
import { trackConversion } from '@/lib/referral';

interface SubscriptionPaymentSession {
  subscriberWallet: string;
  providerWallet: string;
  priceUsdc: number;
  status: 'pending' | 'paid';
}

export async function GET(req: NextRequest) {
  const amountParam = req.nextUrl.searchParams.get('amount');
  if (!amountParam) {
    return NextResponse.json({ error: 'amount required' }, { status: 400 });
  }

  const raw = await redis.get(KEYS.subscriptionPayment(amountParam));
  if (!raw) {
    return NextResponse.json({ status: 'expired' });
  }

  const session: SubscriptionPaymentSession =
    typeof raw === 'string' ? JSON.parse(raw) : (raw as SubscriptionPaymentSession);

  if (session.status === 'paid') {
    return NextResponse.json({ status: 'confirmed' });
  }

  const treasuryWallet = process.env.TREASURY_WALLET;
  const heliusApiKey = process.env.HELIUS_API_KEY;
  const usdcMint = process.env.USDC_MINT;
  const amount = parseFloat(amountParam);

  const res = await fetch(
    `https://api.helius.xyz/v0/addresses/${treasuryWallet}/transactions?api-key=${heliusApiKey}&limit=10&type=TRANSFER`,
  );
  if (!res.ok) {
    return NextResponse.json({ status: 'pending' });
  }

  const txs = await res.json();

  for (const tx of txs) {
    for (const transfer of tx.tokenTransfers ?? []) {
      if (
        transfer.toUserAccount === treasuryWallet &&
        transfer.mint === usdcMint &&
        Math.abs(transfer.tokenAmount - amount) < 0.000001
      ) {
        await verifyAndGrantSubscription(amountParam);
        const walletShort = `${session.subscriberWallet.slice(0, 4)}...${session.subscriberWallet.slice(-4)}`;
        await sendPaymentConfirmation(session.subscriberWallet, 'signals', walletShort, session.priceUsdc);
        const refCode = req.cookies.get('rektreceipt-ref')?.value;
        if (refCode) await trackConversion(refCode, session.priceUsdc, session.subscriberWallet);
        return NextResponse.json({ status: 'confirmed' });
      }
    }
  }

  return NextResponse.json({ status: 'pending' });
}
