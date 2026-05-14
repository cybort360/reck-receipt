import type { SwapTransaction } from './helius';
import { getSolPriceAtTimestamp } from './price';

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
