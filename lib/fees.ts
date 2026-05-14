import type { SwapTransaction } from './helius';

export interface LeakageSummary {
  totalFeesSol: number;
  totalJitoTips: number;
  totalJitoTipsSol: number;
  totalLeakageSol: number;
  totalLeakageUsd: number;
  transactionCount: number;
  sandwichCount: number;
}

export function calculateLeakage(txs: SwapTransaction[], solPriceUsd: number): LeakageSummary {
  const totalFeesSol = txs.reduce((sum, tx) => sum + tx.fee / 1e9, 0);
  const totalJitoTips = txs.filter((tx) => tx.hasJitoTip).length;
  const totalJitoTipsSol = txs.reduce((sum, tx) => sum + tx.jitoTipLamports / 1e9, 0);
  const totalLeakageSol = totalFeesSol + totalJitoTipsSol;
  const totalLeakageUsd = totalLeakageSol * solPriceUsd;

  const sandwichCount = txs.filter((tx) => tx.likelySandwiched).length;

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
