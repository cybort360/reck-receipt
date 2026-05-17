import { NextRequest, NextResponse } from 'next/server';
import { generateWrapped } from '@/lib/wrapped';
import { KEYS } from '@/lib/redis/keys';
import { redis } from '@/lib/redis';
import { getTelegramChatId, sendTelegramMessage } from '@/lib/telegram';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  let prevYear: number;
  let prevMonth: number;
  if (currentMonth === 1) {
    prevYear = currentYear - 1;
    prevMonth = 12;
  } else {
    prevYear = currentYear;
    prevMonth = currentMonth - 1;
  }

  const wallets = await redis.smembers(KEYS.proWallets());

  let generated = 0;
  let notified = 0;
  let errors = 0;

  for (const wallet of wallets) {
    try {
      await generateWrapped(wallet, prevYear, prevMonth);
      generated++;

      const chatId = await getTelegramChatId(wallet);
      if (chatId) {
        const monthName = MONTHS[prevMonth - 1];
        const yyyyMm = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        const message =
          `🎁 Your Rekt Wrapped for ${monthName} ${prevYear} is live → rektreceipt.xyz/wrapped/${wallet}/${yyyyMm}`;
        await sendTelegramMessage(chatId, message);
        notified++;
      }
    } catch (err) {
      console.error(`[generate-wrapped] Error processing wallet ${wallet}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ generated, notified, errors, total: wallets.length });
}
