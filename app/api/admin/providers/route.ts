import { NextRequest, NextResponse } from 'next/server';
import { isAdminToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { listSignalProviders } from '@/lib/signals';


export async function GET(req: NextRequest) {
  const token = req.headers.get('x-admin-token') ?? '';
  if (!(await isAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providers = await listSignalProviders();
  return NextResponse.json({ providers });
}
