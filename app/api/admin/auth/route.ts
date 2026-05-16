import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import crypto from 'crypto';

const TOKEN_TTL = 28800; // 8 hours

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'password required' }, { status: 400 });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || body.password !== adminSecret) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await redis.set(`rr:v1:admin:session:${token}`, '1', { ex: TOKEN_TTL });

  return NextResponse.json({ token });
}
