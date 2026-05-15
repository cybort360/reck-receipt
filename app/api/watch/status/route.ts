import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx === -1) return '***';
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx);
  const visible = local.slice(-3);
  const hidden = '*'.repeat(Math.max(0, local.length - 3));
  return `${hidden}${visible}${domain}`;
}

function maskChatId(id: string): string {
  const visible = id.slice(-3);
  const hidden = '*'.repeat(Math.max(0, id.length - 3));
  return `${hidden}${visible}`;
}

interface WatchConfig {
  wallet: string;
  email: string | null;
  telegramChatId: string | null;
  registeredAt: number;
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const raw = await redis.get(`watch:${wallet}`);
  if (!raw) {
    return NextResponse.json({ watching: false });
  }

  const config: WatchConfig = typeof raw === 'string' ? JSON.parse(raw) : raw;

  return NextResponse.json({
    watching: true,
    config: {
      registeredAt: config.registeredAt,
      email: config.email ? maskEmail(config.email) : null,
      telegramChatId: config.telegramChatId ? maskChatId(String(config.telegramChatId)) : null,
    },
  });
}
