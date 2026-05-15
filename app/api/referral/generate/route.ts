import { NextRequest, NextResponse } from 'next/server';
import { generateRefCode } from '@/lib/referral';

export async function POST(req: NextRequest) {
  const { wallet } = await req.json();
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const code = await generateRefCode(wallet);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rektreceipt.xyz';
  const url = `${appUrl}/?ref=${code}`;

  return NextResponse.json({ code, url });
}
