import { NextRequest, NextResponse } from 'next/server';
import { trackClick, getRefStats } from '@/lib/referral';

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }

  const record = await getRefStats(code);
  if (!record) {
    return NextResponse.json({ error: 'referral code not found' }, { status: 404 });
  }

  await trackClick(code);
  return NextResponse.json({ success: true });
}
