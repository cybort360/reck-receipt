import { NextRequest, NextResponse } from 'next/server';
import { generateRefCode } from '@/lib/referral';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const sessionToken = req.headers.get('x-session-token') ?? '';
  const session = await getSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { wallet } = await req.json();
  if (!wallet || session.wallet !== wallet) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const code = await generateRefCode(wallet);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rektreceipt.xyz';
  const url = `${appUrl}/?ref=${code}`;

  return NextResponse.json({ code, url });
}
