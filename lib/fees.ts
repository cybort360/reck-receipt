import type { SwapTransaction } from './helius';
import { getSolPriceAtTimestamp } from './price';

export interface TokenBreakdownEntry {
  symbol: string;
  mint: string;
  totalFeesUsd: number;
  swapCount: number;
}

export interface LeakageSummary {
  totalFeesSol: number;
  totalJitoTips: number;
  totalJitoTipsSol: number;
  totalLeakageSol: number;
  totalLeakageUsd: number;
  transactionCount: number;
  sandwichCount: number;
}

export async function calculateLeakage(txs: SwapTransaction[]): Promise<LeakageSummary> {
  const totalFeesSol = txs.reduce((sum, tx) => sum + tx.fee / 1e9, 0);
  const totalJitoTips = txs.filter((tx) => tx.hasJitoTip).length;
  const totalJitoTipsSol = txs.reduce((sum, tx) => sum + tx.jitoTipLamports / 1e9, 0);
  const totalLeakageSol = totalFeesSol + totalJitoTipsSol;
  const sandwichCount = txs.filter((tx) => tx.likelySandwiched).length;

  const prices = await Promise.all(
    txs.map((tx) => getSolPriceAtTimestamp(tx.timestamp * 1000)),
  );
  const totalLeakageUsd = txs.reduce((sum, tx, i) => {
    const leakageSol = tx.fee / 1e9 + tx.jitoTipLamports / 1e9;
    return sum + leakageSol * prices[i];
  }, 0);

  return {
    totalFeesSol,
    totalJitoTips,
    totalJitoTipsSol,
    totalLeakageSol,
    totalLeakageUsd,
    transactionCount: txs.length,
    sandwichCount,
  };
}

function dateKey(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function calculateTokenBreakdown(
  txs: SwapTransaction[],
  tokenMetadata: Map<string, { symbol: string; name: string }>,
  solPricesByDate: Map<string, number>,
): TokenBreakdownEntry[] {
  const groups = new Map<string, { symbol: string; totalFeesUsd: number; swapCount: number }>();

  for (const tx of txs) {
    const incoming = tx.tokenTransfers.filter((t) => t.toUserAccount !== '' && t.tokenAmount > 0);
    if (incoming.length === 0) continue;

    const largest = incoming.reduce((best, t) => (t.tokenAmount > best.tokenAmount ? t : best));
    const mint = largest.mint;
    const symbol = tokenMetadata.get(mint)?.symbol ?? mint.slice(0, 4);

    const solPrice = solPricesByDate.get(dateKey(tx.timestamp)) ?? 150;
    const feesUsd = (tx.fee / 1e9 + tx.jitoTipLamports / 1e9) * solPrice;

    const existing = groups.get(mint);
    if (existing) {
      existing.totalFeesUsd += feesUsd;
      existing.swapCount += 1;
    } else {
      groups.set(mint, { symbol, totalFeesUsd: feesUsd, swapCount: 1 });
    }
  }

  return Array.from(groups.entries())
    .map(([mint, g]) => ({ mint, symbol: g.symbol, totalFeesUsd: g.totalFeesUsd, swapCount: g.swapCount }))
    .sort((a, b) => b.totalFeesUsd - a.totalFeesUsd)
    .slice(0, 5);
}
