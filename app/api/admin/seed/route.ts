import { NextRequest, NextResponse } from 'next/server';
import { auditWallet } from '@/lib/auditWallet';
import { KEYS } from '@/lib/redis/keys';

const MAX_WALLETS = 25;

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.wallets)) {
    return NextResponse.json({ error: 'body must contain { wallets: string[] }' }, { status: 400 });
  }

  const wallets: string[] = body.wallets
    .filter((w: unknown) => typeof w === 'string' && w.trim())
    .map((w: string) => w.trim())
    .slice(0, MAX_WALLETS);

  if (wallets.length === 0) {
    return NextResponse.json({ error: 'no valid wallet addresses provided' }, { status: 400 });
  }

  let seeded = 0;
  const failed: string[] = [];

  for (const wallet of wallets) {
    try {
      console.log('writing to key:', KEYS.auditedWallets());
      await auditWallet(wallet);
      console.log(`Seeded: ${wallet}`);
      seeded++;
    } catch (err) {
      console.error(`Seed failed for ${wallet}:`, err);
      failed.push(wallet);
    }

    if (wallet !== wallets[wallets.length - 1]) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return NextResponse.json({ seeded, failed, total: wallets.length });
}
