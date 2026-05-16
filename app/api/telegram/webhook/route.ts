import { NextRequest, NextResponse } from 'next/server';
import { storeTelegramChatId, sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incoming = req.headers.get('x-telegram-bot-api-secret-token');
    if (incoming !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({}));
  console.log('webhook payload:', JSON.stringify(body, null, 2));

  try {
    const text: string = body?.message?.text ?? '';
    const chatId: string = String(body?.message?.chat?.id ?? '');

    if (!chatId || !text.startsWith('/start')) {
      return NextResponse.json({ ok: true });
    }

    const wallet: string = text.split(' ')[1] ?? '';

    if (wallet) {
      await storeTelegramChatId(wallet, chatId);
      await sendTelegramMessage(
        chatId,
        'You will now receive signal alerts for wallets you subscribe to on RektReceipt.',
      );
    } else {
      await sendTelegramMessage(
        chatId,
        'Visit rektreceipt.xyz/signals to subscribe to a signal provider first.',
      );
    }
  } catch (err) {
    console.error('webhook handler error:', err);
  }

  // Always return 200 — Telegram retries on any non-2xx response
  return NextResponse.json({ ok: true });
}
