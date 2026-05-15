import { NextRequest, NextResponse } from 'next/server';
import { fetchSwapTransactions } from '@/lib/helius';
import { calculateLeakage, calculateTokenBreakdown } from '@/lib/fees';
import { calculatePnl } from '@/lib/pnl';
import { getTokenMetadata } from '@/lib/tokens';
import { getSolPriceAtTimestamp } from '@/lib/price';
import { redis } from '@/lib/redis';
import { getTraderPersonality } from '@/lib/personality';
import { calculateProjection } from '@/lib/projection';
import { getProStatus } from '@/lib/pro';
import { getDeadTokens } from '@/lib/deadTokens';
import { detectOvertrading } from '@/lib/overtrading';
import { detectAddressPoisoning } from '@/lib/addressPoisoning';
import { auditRatelimit } from '@/lib/ratelimit';
import { KEYS } from '@/lib/redis/keys';

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateId(): string {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function calculateGrade(usd: number): string {
  if (usd < 1) return 'A';
  if (usd < 5) return 'B';
  if (usd < 20) return 'C';
  if (usd < 50) return 'D';
  return 'F';
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await auditRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
        },
      },
    );
  }

  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const bustRequested = req.nextUrl.searchParams.get('bust');
  const bust = adminSecret && req.headers.get('x-admin-secret') === adminSecret ? bustRequested : null;
  let fromCache = false;

  if (!bust) {
    const cached = await redis.get(KEYS.audit(wallet));
    if (cached) {
      fromCache = true;
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return NextResponse.json({ ...parsed, cached: true });
    }
  }

  // Start dead token lookup immediately — only needs wallet, runs in background
  const deadTokensPromise = getDeadTokens(wallet).catch((err) => {
    console.error('[DEAD TOKENS]', err);
    return [] as Awaited<ReturnType<typeof getDeadTokens>>;
  });

  const proStatus = await getProStatus(wallet);
  const txLimit = proStatus.isPro ? 500 : 100;

  const txs = await fetchSwapTransactions(wallet, txLimit);

  const mints = [...new Set(txs.flatMap((tx) => tx.tokenTransfers.map((t) => t.mint)).filter(Boolean))];
  const [summary, tokenMetadata, pnl] = await Promise.all([
    calculateLeakage(txs),
    getTokenMetadata(mints),
    calculatePnl(txs, wallet),
  ]);

  const solPricesByDate = new Map<string, number>();
  await Promise.all(
    txs.map(async (tx) => {
      const d = new Date(tx.timestamp * 1000);
      const key = `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
      if (!solPricesByDate.has(key)) {
        solPricesByDate.set(key, await getSolPriceAtTimestamp(tx.timestamp * 1000));
      }
    }),
  );

  const tokenBreakdown = calculateTokenBreakdown(txs, tokenMetadata, solPricesByDate);

  // Peer comparison — fire immediately, await later
  const peerStatsPromise = (async () => {
    const keys = await redis.keys('receipt:*');
    const receipts = await Promise.all(keys.map((k) => redis.get<{ transactionCount: number; totalLeakageUsd: number }>(k)));
    const peers = receipts.filter((r): r is { transactionCount: number; totalLeakageUsd: number } => {
      if (!r) return false;
      const lo = summary.transactionCount * 0.8;
      const hi = summary.transactionCount * 1.2;
      return r.transactionCount >= lo && r.transactionCount <= hi;
    });
    if (peers.length < 3) return { peerAvgLeakageUsd: null, peerPercentile: null };
    const peerAvgLeakageUsd = peers.reduce((sum, p) => sum + p.totalLeakageUsd, 0) / peers.length;
    const worse = peers.filter((p) => p.totalLeakageUsd <= summary.totalLeakageUsd).length;
    const peerPercentile = Math.round((worse / peers.length) * 100);
    return { peerAvgLeakageUsd, peerPercentile };
  })();

  // Sync derivations — no I/O, compute while async work is in flight
  const grade = calculateGrade(summary.totalLeakageUsd);
  const personality = getTraderPersonality({
    transactionCount: summary.transactionCount,
    totalLeakageUsd: summary.totalLeakageUsd,
    totalJitoTips: summary.totalJitoTips,
    grade,
  });
  const projection = calculateProjection(txs, summary.totalLeakageUsd);
  const overtrading = detectOvertrading(tokenBreakdown);
  const addressPoisoning = detectAddressPoisoning(txs);

  // Collect all in-flight async results together
  const [{ peerAvgLeakageUsd, peerPercentile }, deadTokens] = await Promise.all([
    peerStatsPromise,
    deadTokensPromise,
  ]);
  console.log('[DEAD TOKENS]', deadTokens.length, 'found');

  const shareId = generateId();
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const weekKey = `rektboard:week:${week}`;
  const historyKey = KEYS.history(wallet);
  const historyEntry = JSON.stringify({
    timestamp: Date.now(),
    totalLeakageUsd: summary.totalLeakageUsd,
    totalFeesSol: summary.totalFeesSol,
    totalJitoTipsSol: summary.totalJitoTipsSol,
    transactionCount: summary.transactionCount,
    grade: calculateGrade(summary.totalLeakageUsd),
    shareId,
  });

  const cacheObject = {
    wallet,
    totalFeesSol: summary.totalFeesSol,
    totalJitoTips: summary.totalJitoTips,
    totalJitoTipsSol: summary.totalJitoTipsSol,
    totalLeakageSol: summary.totalLeakageSol,
    totalLeakageUsd: summary.totalLeakageUsd,
    transactionCount: summary.transactionCount,
    sandwichCount: summary.sandwichCount,
    shareId,
    tokenBreakdown,
    personality,
    projection,
    overtrading,
    addressPoisoning,
    deadTokens,
    txs: txs.map((tx) => ({
      signature: tx.signature,
      timestamp: tx.timestamp,
      fee: tx.fee,
      jitoTipLamports: tx.jitoTipLamports,
      hasJitoTip: tx.hasJitoTip,
    })),
  };
  console.log('caching:', JSON.stringify(cacheObject).slice(0, 200));

  // All Redis writes in parallel — non-fatal ones are wrapped so they don't reject
  await Promise.all([
    redis.set(KEYS.audit(wallet), JSON.stringify(cacheObject), { ex: 14400 }),
    redis.set(`receipt:${shareId}`, JSON.stringify({ wallet, ...summary }), { ex: 604800 }),
    redis.set(KEYS.shareByWallet(wallet), shareId),
    redis.zadd(KEYS.lbGlobal(), { score: summary.totalLeakageUsd, member: wallet }),
    redis.zadd(weekKey, { score: summary.totalLeakageUsd, member: wallet }),
    redis.expire(weekKey, 1209600),
    // History writes must stay sequential (ltrim after lpush), wrapped as non-fatal
    (async () => {
      try {
        await redis.lpush(historyKey, historyEntry);
        await redis.ltrim(historyKey, 0, 29);
      } catch (err) {
        void err;
      }
    })(),
    // Token index writes — non-fatal, skipped for cached responses
    !fromCache
      ? (async () => {
          try {
            const indexOps: Promise<unknown>[] = [];
            for (const token of tokenBreakdown) {
              indexOps.push(redis.zincrby(KEYS.tokenTraders(token.mint), 1, wallet));
            }
            for (const token of deadTokens) {
              indexOps.push(redis.zincrby(KEYS.tokenRugs(token.mint), 1, wallet));
              indexOps.push(redis.zincrby(KEYS.lbGraveyard(), 1, token.mint));
              indexOps.push(redis.hset('tokensymbols', { [token.mint]: token.symbol }));
            }
            await Promise.all(indexOps);
          } catch (err) {
            void err;
          }
        })()
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ...cacheObject, peerAvgLeakageUsd, peerPercentile, pnl, isPro: proStatus.isPro });
}
