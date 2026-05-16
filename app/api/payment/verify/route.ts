import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { grantPro, grantSignals } from '@/lib/pro';
import { sendPaymentConfirmation } from '@/lib/email';
import { trackConversion } from '@/lib/referral';

interface PaymentRecord {
  wallet: string;
  plan?: 'pro' | 'signals';
  createdAt: number;
  status: string;
}

export async function GET(req: NextRequest) {
  const amountParam = req.nextUrl.searchParams.get('amount');
  if (!amountParam) {
    return NextResponse.json({ error: 'amount required' }, { status: 400 });
  }

  const amount = parseFloat(amountParam);
  const raw = await redis.get(KEYS.payment(String(amount)));
  if (!raw) {
    return NextResponse.json({ status: 'expired' });
  }

  const record: PaymentRecord = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (record.status === 'confirmed') {
    return NextResponse.json({ status: 'confirmed', wallet: record.wallet });
  }

  const treasuryWallet = process.env.TREASURY_WALLET;
  const heliusApiKey = process.env.HELIUS_API_KEY;
  const usdcMint = process.env.USDC_MINT;

  try {
    const res = await fetch(
      `https://api.helius.xyz/v0/addresses/${treasuryWallet}/transactions?api-key=${heliusApiKey}&limit=10&type=TRANSFER`,
    );

    if (!res.ok) {
      return NextResponse.json({ status: 'pending' });
    }

    const txs = await res.json();

    for (const tx of txs) {
      const transfers = tx.tokenTransfers ?? [];
      for (const transfer of transfers) {
        if (
          transfer.toUserAccount === treasuryWallet &&
          transfer.mint === usdcMint &&
          Math.abs(transfer.tokenAmount - amount) < 0.000001
        ) {
          // Atomic lock — only the first concurrent request proceeds
          const lockKey = `rr:v1:payment:lock:${amount}`;
          const locked = await redis.set(lockKey, '1', { nx: true, ex: 60 });
          if (!locked) {
            return NextResponse.json({ status: 'confirmed', wallet: record.wallet });
          }

          const plan = record.plan === 'signals' ? 'signals' : 'pro';
          if (record.plan === 'signals') {
            await grantSignals(record.wallet);
          } else {
            await grantPro(record.wallet, tx.signature, 'crypto_usdc');
          }
          await redis.set(
            KEYS.payment(String(amount)),
            JSON.stringify({ ...record, status: 'confirmed' }),
            { ex: 1800 },
          );
          const walletShort = `${record.wallet.slice(0, 4)}...${record.wallet.slice(-4)}`;
          await sendPaymentConfirmation(record.wallet, plan, walletShort, amount);
          const refCode = req.cookies.get('rektreceipt-ref')?.value;
          if (refCode) await trackConversion(refCode, amount, record.wallet);
          return NextResponse.json({ status: 'confirmed', wallet: record.wallet });
        }
      }
    }

    return NextResponse.json({ status: 'pending' });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Payment verification failed. Try again later.' }, { status: 500 });
  }
}
