import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { grantPro } from '@/lib/pro';

interface PaymentRecord {
  wallet: string;
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
        await grantPro(record.wallet, tx.signature, 'crypto_usdc');
        await redis.set(
          KEYS.payment(String(amount)),
          JSON.stringify({ ...record, status: 'confirmed' }),
          { ex: 1800 },
        );
        return NextResponse.json({ status: 'confirmed', wallet: record.wallet });
      }
    }
  }

  return NextResponse.json({ status: 'pending' });
}
