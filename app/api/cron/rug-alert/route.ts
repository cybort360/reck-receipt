import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { getTelegramChatId, sendTelegramMessage } from '@/lib/telegram';
import { getSolPriceAtTimestamp } from '@/lib/price';

const ALERT_TTL_SECONDS = 7 * 24 * 60 * 60;
const DROP_THRESHOLD = 0.2;     // current must be ≤20% of entry to trigger (80% drop)
const MIN_ENTRY_PRICE_USD = 0.000001; // ignore legs with implausibly low implied prices
const CURSE_MIN_WALLETS = 3;    // >3 other wallets lost money on this token

interface CachedLeg {
  mint: string;
  direction: 'buy' | 'sell';
  solAmount: number;   // lamports
  tokenAmount: number; // UI amount (decimal-adjusted)
  timestamp: number;   // unix seconds
}

interface CachedTx {
  timestamp: number;
  legs: CachedLeg[];
}

interface CachedAudit {
  tokenBreakdown: Array<{ mint: string; symbol: string }>;
  deadTokens?: Array<{ mint: string; symbol: string }>;
  txs: CachedTx[];
}

interface JupiterPriceData {
  data: Record<string, { price: number } | null>;
}

async function fetchCurrentPrices(mints: string[]): Promise<Map<string, number>> {
  if (mints.length === 0) return new Map();
  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${mints.join(',')}`);
    if (!res.ok) return new Map();
    const body = (await res.json()) as JupiterPriceData;
    const map = new Map<string, number>();
    for (const [mint, entry] of Object.entries(body.data ?? {})) {
      if (entry && entry.price > 0) map.set(mint, entry.price);
    }
    return map;
  } catch {
    return new Map();
  }
}

// Returns the most recent buy leg for a given mint where we can derive a price.
// Only considers SOL-paired buys (solAmount > 0) — token-to-token swaps yield no
// reliable price reference.
function lastSolBuyLeg(txs: CachedTx[], mint: string): CachedLeg | null {
  let best: CachedLeg | null = null;
  for (const tx of txs) {
    for (const leg of tx.legs) {
      if (
        leg.mint === mint &&
        leg.direction === 'buy' &&
        leg.solAmount > 0 &&
        leg.tokenAmount > 0
      ) {
        if (!best || leg.timestamp > best.timestamp) best = leg;
      }
    }
  }
  return best;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wallets = await redis.smembers<string[]>('watched-wallets');

  let deadBagAlerts = 0;
  let curseAlerts = 0;
  let noCache = 0;

  for (const wallet of wallets) {
    const raw = await redis.get<string | CachedAudit>(KEYS.audit(wallet));
    if (!raw) { noCache++; continue; }

    const audit: CachedAudit = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const chatId = await getTelegramChatId(wallet);

    // Batch current prices for all mints this wallet has touched.
    const allMints = [
      ...new Set([
        ...audit.tokenBreakdown.map((t) => t.mint),
        ...(audit.deadTokens ?? []).map((t) => t.mint),
      ]),
    ];
    const currentPrices = await fetchCurrentPrices(allMints);

    // ── Condition 1: Dead bag — token dropped >80% since last SOL-paired buy ──
    for (const token of audit.tokenBreakdown) {
      const alertKey = KEYS.alertSent(wallet, token.mint);
      if (await redis.get(alertKey)) continue;

      const leg = lastSolBuyLeg(audit.txs, token.mint);
      if (!leg) continue;

      const solPriceUsd = await getSolPriceAtTimestamp(leg.timestamp * 1000);
      const entryPriceUsd = (leg.solAmount / 1e9 / leg.tokenAmount) * solPriceUsd;
      const currentPriceUsd = currentPrices.get(token.mint) ?? 0;

      if (entryPriceUsd < MIN_ENTRY_PRICE_USD || currentPriceUsd <= 0) continue;
      if (currentPriceUsd >= entryPriceUsd * DROP_THRESHOLD) continue;

      const dropPct = Math.round((1 - currentPriceUsd / entryPriceUsd) * 100);
      await redis.set(alertKey, '1', { ex: ALERT_TTL_SECONDS });

      if (chatId) {
        await sendTelegramMessage(
          chatId,
          `💀 <b>Dead Bag Alert: ${token.symbol}</b>\n\n` +
            `Entry price: ~$${entryPriceUsd.toFixed(6)}\n` +
            `Current price: $${currentPriceUsd.toFixed(6)}\n` +
            `Down: ${dropPct}% since your last buy\n\n` +
            `Full audit: rektreceipt.xyz`,
        );
        deadBagAlerts++;
      }
    }

    // ── Condition 2: Curse token — held dead token that rugged many wallets ──
    for (const token of audit.deadTokens ?? []) {
      const alertKey = KEYS.alertSent(wallet, token.mint);
      if (await redis.get(alertKey)) continue;

      const rugWalletCount = await redis.zcard(KEYS.tokenRugs(token.mint));
      if (rugWalletCount <= CURSE_MIN_WALLETS) continue;

      await redis.set(alertKey, '1', { ex: ALERT_TTL_SECONDS });

      if (chatId) {
        await sendTelegramMessage(
          chatId,
          `☠️ <b>Curse Token: ${token.symbol}</b>\n\n` +
            `${rugWalletCount} wallets on RektReceipt lost money on this token.\n` +
            `You're still holding it.\n\n` +
            `Full audit: rektreceipt.xyz`,
        );
        curseAlerts++;
      }
    }
  }

  return NextResponse.json({
    deadBagAlerts,
    curseAlerts,
    noCache,
    total: wallets.length,
  });
}
