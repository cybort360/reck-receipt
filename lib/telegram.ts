import { redis } from './redis';
import { KEYS } from './redis/keys';

export async function sendTelegramMessage(chatId: string, message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    console.log('[TG] sendTelegramMessage: skipped — token or chatId missing', { hasToken: !!token, chatId });
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  });

  const responseBody = await res.json().catch(() => null);
  console.log('[TG] sendTelegramMessage response:', JSON.stringify(responseBody, null, 2));

  if (!res.ok) {
    console.error('[TG] sendTelegramMessage failed — HTTP', res.status, responseBody);
  }
}

export async function storeTelegramChatId(wallet: string, chatId: string): Promise<void> {
  await redis.set(KEYS.telegramChatId(wallet), chatId);
}

export async function getTelegramChatId(wallet: string): Promise<string | null> {
  return redis.get<string>(KEYS.telegramChatId(wallet));
}

export async function notifyNewSignal(
  providerWallet: string,
  providerName: string,
  symbol: string,
  direction: string,
  note: string,
): Promise<void> {
  // Find all subscribers for this provider from the subscription index
  const members = await redis.smembers<string[]>(KEYS.subscriptionIndex());
  const subscribers = members
    .filter((m) => m.endsWith(`:${providerWallet}`))
    .map((m) => m.slice(0, m.lastIndexOf(':')));

  if (subscribers.length === 0) return;

  const message =
    `🔔 <b>New Signal from ${providerName}</b>\n\n` +
    `Token: ${symbol}\n` +
    `Direction: ${direction.toUpperCase()}\n` +
    `Note: ${note}\n\n` +
    `View: https://rektreceipt.xyz/signals/feed/${providerWallet}`;

  await Promise.all(
    subscribers.map(async (subscriberWallet) => {
      const chatId = await getTelegramChatId(subscriberWallet);
      if (chatId) await sendTelegramMessage(chatId, message);
    }),
  );
}

export async function notifyNewSubscriber(
  providerName: string,
  subscriberWallet: string,
  providerChatId: string,
): Promise<void> {
  const message =
    `New subscriber: ${subscriberWallet.slice(0, 4)}...${subscriberWallet.slice(-4)} just subscribed to your signals.`;
  await sendTelegramMessage(providerChatId, message);
}
