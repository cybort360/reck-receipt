import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { generateWeeklySummary } from '@/lib/watch';
import { auditWallet } from '@/lib/auditWallet';

interface WatchConfig {
  wallet: string;
  email: string | null;
  telegramChatId: string | null;
  registeredAt: number;
}

function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx === -1) return '***';
  const local = email.slice(0, atIdx);
  const visible = local.slice(-3);
  const hidden = '*'.repeat(Math.max(0, local.length - 3));
  return `${hidden}${visible}${email.slice(atIdx)}`;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const wallets = await redis.smembers('watched-wallets');

  const results: { wallet: string; sent: boolean; reason?: string }[] = [];

  for (const wallet of wallets) {
    const [rawConfig, rawAudit] = await Promise.all([
      redis.get(KEYS.userWatch(wallet)),
      redis.get(KEYS.audit(wallet)),
    ]);

    if (!rawConfig) {
      results.push({ wallet, sent: false, reason: 'no watch config' });
      continue;
    }

    const config: WatchConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;

    let auditResult = rawAudit
      ? (typeof rawAudit === 'string' ? JSON.parse(rawAudit) : rawAudit)
      : null;

    if (!auditResult) {
      try {
        const { cacheObject } = await auditWallet(wallet);
        auditResult = cacheObject;
      } catch {
        results.push({ wallet, sent: false, reason: 'audit failed' });
        continue;
      }
    }
    const summary = generateWeeklySummary(wallet, auditResult);

    if (config.email) {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'watch@rektreceipt.xyz',
          to: config.email,
          subject: 'Your weekly RektReceipt',
          text: summary,
        });
      } else {
        console.log(`[WATCH] Would send email to ${maskEmail(config.email)} for ${wallet}`);
      }
    }

    if (config.telegramChatId) {
      if (process.env.TELEGRAM_BOT_TOKEN) {
        try {
          const tgRes = await fetch(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: config.telegramChatId, text: summary, parse_mode: 'HTML' }),
            },
          );
          if (!tgRes.ok) {
            const err = await tgRes.text();
            console.error(`[WATCH] Telegram send failed for ${wallet}:`, err);
          }
        } catch (err) {
          console.error(`[WATCH] Telegram error for ${wallet}:`, err);
        }
      } else {
        console.log(`[WATCH] Would send Telegram to ${config.telegramChatId} for ${wallet}`);
      }
    }

    void summary;
    results.push({ wallet, sent: true });
  }

  return NextResponse.json({ processed: wallets.length, results });
}
