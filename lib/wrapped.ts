import { fetchSwapTransactionsByMonth } from './helius';
import { calculateLeakage, calculateTokenBreakdown } from './fees';
import { getDeadTokens } from './deadTokens';
import { getTokenMetadata } from './tokens';
import { getSolPriceAtTimestamp } from './price';
import { computeRektScore } from './rektScore';
import { getTraderPersonality } from './personality';
import { calculateGrade } from './auditWallet';
import { redis } from './redis';
import { KEYS } from './redis/keys';

export interface WrappedData {
  wallet: string;
  year: number;
  month: number;
  totalFeesUsd: number;
  grade: string;
  rektScore: number;
  swapCount: number;
  worstTrade: { symbol: string; mint: string; feeUsd: number; timestamp: number } | null;
  deadTokens: Array<{ mint: string; symbol: string }>;
  personality: { type: string; description: string };
  communityPercentile: number | null;
  generatedAt: number;
}

function dateKey(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
}

export async function generateWrapped(
  wallet: string,
  year: number,
  month: number,
): Promise<WrappedData> {
  const txs = await fetchSwapTransactionsByMonth(wallet, year, month);

  const mints = [
    ...new Set(txs.flatMap((tx) => tx.tokenTransfers.map((t) => t.mint)).filter(Boolean)),
  ];

  const solPricesByDate = new Map<string, number>();
  await Promise.all(
    txs.map(async (tx) => {
      const key = dateKey(tx.timestamp);
      if (!solPricesByDate.has(key)) {
        solPricesByDate.set(key, await getSolPriceAtTimestamp(tx.timestamp * 1000));
      }
    }),
  );

  const [summary, tokenMetadata, deadTokensFull] = await Promise.all([
    calculateLeakage(txs),
    getTokenMetadata(mints),
    getDeadTokens(wallet).catch(() => []),
  ]);

  const tokenBreakdown = calculateTokenBreakdown(txs, tokenMetadata, solPricesByDate);
  const grade = calculateGrade(summary.totalLeakageUsd);

  const rektScore = computeRektScore({
    totalLeakageUsd: summary.totalLeakageUsd,
    transactionCount: summary.transactionCount,
    tokenBreakdown,
    overtrading: null,
    deadTokens: deadTokensFull,
  });

  const personality = getTraderPersonality({
    transactionCount: summary.transactionCount,
    totalLeakageUsd: summary.totalLeakageUsd,
    totalJitoTips: summary.totalJitoTips,
    grade,
  });

  // Find most expensive single swap by USD cost
  let worstTrade: WrappedData['worstTrade'] = null;
  let maxFeeUsd = 0;
  for (const tx of txs) {
    if (tx.legs.length === 0) continue;
    const solPrice = solPricesByDate.get(dateKey(tx.timestamp)) ?? 150;
    const feeUsd = ((tx.fee + tx.jitoTipLamports) / 1e9) * solPrice;
    if (feeUsd > maxFeeUsd) {
      maxFeeUsd = feeUsd;
      const leg = tx.legs[0];
      const symbol =
        tokenBreakdown.find((t) => t.mint === leg.mint)?.symbol ??
        `${leg.mint.slice(0, 4)}…`;
      worstTrade = { symbol, mint: leg.mint, feeUsd, timestamp: tx.timestamp };
    }
  }

  // Community percentile: what % of audited wallets have higher leakage
  let communityPercentile: number | null = null;
  const totalWallets = await redis.zcard(KEYS.lbGlobal());
  if (totalWallets >= 3) {
    // zrank returns 0-based index from lowest score; higher rank = more rekt
    const rank = await redis.zrank(KEYS.lbGlobal(), wallet);
    if (rank !== null) {
      communityPercentile = Math.round((rank / totalWallets) * 100);
    }
  }

  const result: WrappedData = {
    wallet,
    year,
    month,
    totalFeesUsd: summary.totalLeakageUsd,
    grade,
    rektScore: rektScore.score,
    swapCount: summary.transactionCount,
    worstTrade,
    deadTokens: deadTokensFull.map((t) => ({ mint: t.mint, symbol: t.symbol })),
    personality: { type: personality.title, description: personality.description },
    communityPercentile,
    generatedAt: Date.now(),
  };

  const yyyyMm = `${year}-${String(month).padStart(2, '0')}`;
  await Promise.all([
    redis.set(KEYS.wrapped(wallet, yyyyMm), JSON.stringify(result)),
    redis.set(KEYS.wrappedLatest(wallet), yyyyMm),
  ]);

  return result;
}
