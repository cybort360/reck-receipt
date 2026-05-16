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
  console.log('[TG] body received:', JSON.stringify(body, null, 2));

  try {
    const text: string = body?.message?.text ?? '';
    const chatId: string = String(body?.message?.chat?.id ?? '');

    console.log('[TG] chatId:', chatId);
    console.log('[TG] text:', text);

    if (!chatId || !text.startsWith('/start')) {
      return NextResponse.json({ ok: true });
    }

    const wallet: string = text.split(' ')[1] ?? '';
    console.log('[TG] wallet:', wallet);

    if (wallet) {
      await storeTelegramChatId(wallet, chatId);
      console.log('[TG] calling sendTelegramMessage — activation message');
      await sendTelegramMessage(
        chatId,
        'You will now receive signal alerts for wallets you subscribe to on RektReceipt.',
      );
      console.log('[TG] sendTelegramMessage result: done');
    } else {
      console.log('[TG] calling sendTelegramMessage — no wallet message');
      await sendTelegramMessage(
        chatId,
        'Visit rektreceipt.xyz/signals to subscribe to a signal provider first.',
      );
      console.log('[TG] sendTelegramMessage result: done');
    }
  } catch (err) {
    console.error('[TG] webhook handler error:', err);
  }

  // Always return 200 — Telegram retries on any non-2xx response
  return NextResponse.json({ ok: true });
}
