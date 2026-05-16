import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'password required' }, { status: 400 });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || body.password !== adminSecret) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  return NextResponse.json({ token: adminSecret });
}
