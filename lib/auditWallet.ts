import { fetchSwapTransactions } from '@/lib/helius';
import { calculateLeakage, calculateTokenBreakdown } from '@/lib/fees';
import { calculatePnl, calculateRealizedPnl } from '@/lib/pnl';
import { getTokenMetadata } from '@/lib/tokens';
import { getSolPriceAtTimestamp } from '@/lib/price';
import { redis } from '@/lib/redis';
import { getTraderPersonality } from '@/lib/personality';
import { calculateProjection } from '@/lib/projection';
import { getProStatus } from '@/lib/pro';
import { getDeadTokens } from '@/lib/deadTokens';
import { detectOvertrading } from '@/lib/overtrading';
import { detectAddressPoisoning } from '@/lib/addressPoisoning';
import { KEYS } from '@/lib/redis/keys';
import { computeRektScore } from '@/lib/rektScore';
import { computeEfficiencyScore } from '@/lib/efficiencyScore';

const SHARE_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateId(): string {
  return Array.from({ length: 6 }, () =>
    SHARE_ID_CHARS[Math.floor(Math.random() * SHARE_ID_CHARS.length)],
  ).join('');
}

export function calculateGrade(usd: number): string {
  if (usd < 1) return 'A';
  if (usd < 5) return 'B';
  if (usd < 20) return 'C';
  if (usd < 50) return 'D';
  return 'F';
}

export async function auditWallet(wallet: string) {
  const deadTokensPromise = getDeadTokens(wallet).catch((err) => {
    console.error('[DEAD TOKENS]', err);
    return [] as Awaited<ReturnType<typeof getDeadTokens>>;
  });

  const proStatus = await getProStatus(wallet);
  const txLimit = proStatus.isPro ? 500 : 100;

  const txs = await fetchSwapTransactions(wallet, txLimit);

  const mints = [
    ...new Set(txs.flatMap((tx) => tx.tokenTransfers.map((t) => t.mint)).filter(Boolean)),
  ];
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

  const peerStatsPromise = (async () => {
    const keys = await redis.keys('receipt:*');
    const receipts = await Promise.all(
      keys.map((k) => redis.get<{ transactionCount: number; totalLeakageUsd: number }>(k)),
    );
    const peers = receipts.filter(
      (r): r is { transactionCount: number; totalLeakageUsd: number } => {
        if (!r) return false;
        const lo = summary.transactionCount * 0.8;
        const hi = summary.transactionCount * 1.2;
        return r.transactionCount >= lo && r.transactionCount <= hi;
      },
    );
    if (peers.length < 3) return { peerAvgLeakageUsd: null, peerPercentile: null };
    const peerAvgLeakageUsd = peers.reduce((sum, p) => sum + p.totalLeakageUsd, 0) / peers.length;
    const worse = peers.filter((p) => p.totalLeakageUsd <= summary.totalLeakageUsd).length;
    const peerPercentile = Math.round((worse / peers.length) * 100);
    return { peerAvgLeakageUsd, peerPercentile };
  })();

  const allLegs = txs.flatMap((tx) => tx.legs);
  const realizedPnl = calculateRealizedPnl(allLegs);
  const avgSlippagePct =
    txs.length > 0 ? txs.reduce((s, t) => s + t.slippagePct, 0) / txs.length : 0;
  const efficiencyResult = computeEfficiencyScore({
    totalFeesSol: summary.totalFeesSol,
    totalJitoTipsSol: summary.totalJitoTipsSol,
    avgSlippagePct,
    swaps: allLegs,
    pnl: realizedPnl.closedPositions > 0 ? { winRate: realizedPnl.winRate } : undefined,
  });
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
    realizedPnl,
    efficiencyScore: efficiencyResult.efficiencyScore,
    efficiencyLabel: efficiencyResult.label,
    txs: txs.map((tx) => ({
      signature: tx.signature,
      timestamp: tx.timestamp,
      fee: tx.fee,
      jitoTipLamports: tx.jitoTipLamports,
      hasJitoTip: tx.hasJitoTip,
      slippagePct: tx.slippagePct,
      likelySandwiched: tx.likelySandwiched,
      legs: tx.legs,
    })),
  };

  const rektScore = computeRektScore({
    totalLeakageUsd: summary.totalLeakageUsd,
    transactionCount: summary.transactionCount,
    tokenBreakdown,
    overtrading,
    deadTokens,
    pnl,
  });

  console.log('caching:', JSON.stringify(cacheObject).slice(0, 200));

  await Promise.all([
    redis.set(KEYS.audit(wallet), JSON.stringify(cacheObject), { ex: 14400 }),
    redis.set(KEYS.rektScore(wallet), JSON.stringify(rektScore), { ex: 604800 }),
    redis.zadd(KEYS.scoreIndex(), { score: efficiencyResult.efficiencyScore, member: wallet }),
    redis.set(`receipt:${shareId}`, JSON.stringify({ wallet, ...summary }), { ex: 604800 }),
    redis.set(KEYS.shareByWallet(wallet), shareId),
    redis.zadd(KEYS.auditedWallets(), { score: Date.now(), member: wallet }),
    redis.zadd(KEYS.lbGlobal(), { score: summary.totalLeakageUsd, member: wallet }),
    redis.zadd(weekKey, { score: summary.totalLeakageUsd, member: wallet }),
    redis.expire(weekKey, 1209600),
    (async () => {
      try {
        await redis.lpush(historyKey, historyEntry);
        await redis.ltrim(historyKey, 0, 29);
      } catch (err) {
        void err;
      }
    })(),
    (async () => {
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
    })(),
  ]);

  return { cacheObject, peerAvgLeakageUsd, peerPercentile, pnl, rektScore, isPro: proStatus.isPro };
}
