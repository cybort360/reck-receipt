import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { listSignalProviders } from '@/lib/signals';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  return !!secret && req.headers.get('x-admin-token') === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providers = await listSignalProviders();
  return NextResponse.json({ providers });
}
