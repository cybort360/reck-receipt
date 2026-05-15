import { NextRequest, NextResponse } from 'next/server';
import { grantProDev } from '@/lib/pro';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { wallet } = await req.json();
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  await grantProDev(wallet);
  return NextResponse.json({ success: true });
}
