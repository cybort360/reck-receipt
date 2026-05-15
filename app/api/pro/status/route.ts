import { NextRequest, NextResponse } from 'next/server';
import { getProStatus } from '@/lib/pro';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const status = await getProStatus(wallet);
  return NextResponse.json(status);
}
