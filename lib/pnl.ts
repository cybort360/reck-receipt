import type { SwapTransaction } from './helius';
import { getSolPriceAtTimestamp } from './price';

export interface PerTrade {
  signature: string;
  timestamp: number;
  tokenSymbol: string;
  grossValueUsd: number;
  feeUsd: number;
  netValueUsd: number;
}

export interface PnlResult {
  totalRealizedPnlUsd: number;
  totalGrossValueUsd: number;
  totalNetValueUsd: number;
  perTrade: PerTrade[];
}

function tokenAmount(rawAmount: string, decimals: number): number {
  return parseFloat(rawAmount) / Math.pow(10, decimals);
}

export async function calculatePnl(
  txs: SwapTransaction[],
  walletAddress: string,
): Promise<PnlResult> {
  const prices = await Promise.all(
    txs.map((tx) => getSolPriceAtTimestamp(tx.timestamp * 1000)),
  );

  const perTrade: PerTrade[] = txs.map((tx, i) => {
    const solPrice = prices[i];
    const feeUsd = (tx.fee / 1e9) * solPrice;

    const walletAccount = tx.accountData.find((a) => a.account === walletAddress);

    let grossValueUsd = 0;
    let tokenSymbol = 'Unknown';

    if (walletAccount) {
      const nativeChange = walletAccount.nativeBalanceChange;

      const received = walletAccount.tokenBalanceChanges.filter(
        (t) => parseFloat(t.rawTokenAmount.tokenAmount) > 0,
      );
      const sold = walletAccount.tokenBalanceChanges.filter(
        (t) => parseFloat(t.rawTokenAmount.tokenAmount) < 0,
      );

      if (nativeChange > tx.fee) {
        // Wallet received SOL (net positive after fees)
        const solReceived = (nativeChange - tx.fee) / 1e9;
        grossValueUsd = solReceived * solPrice;
        tokenSymbol = sold.length > 0 ? sold[0].mint.slice(0, 4) + ' → SOL' : 'SOL';
      } else if (received.length > 0) {
        // Wallet received a token; use absolute SOL spent as cost-basis proxy for gross value
        const solSpent = Math.abs(nativeChange + tx.fee) / 1e9;
        grossValueUsd = solSpent * solPrice;
        const top = received.reduce((best, t) =>
          tokenAmount(t.rawTokenAmount.tokenAmount, t.rawTokenAmount.decimals) >
          tokenAmount(best.rawTokenAmount.tokenAmount, best.rawTokenAmount.decimals)
            ? t
            : best,
        );
        tokenSymbol = top.mint.slice(0, 4);
      } else if (sold.length > 0 && received.length === 0) {
        // Token-to-token: no native change, use SOL fees as minimum cost
        grossValueUsd = 0;
        tokenSymbol = sold[0].mint.slice(0, 4);
      }
    }

    const netValueUsd = grossValueUsd - feeUsd;

    return {
      signature: tx.signature,
      timestamp: tx.timestamp,
      tokenSymbol,
      grossValueUsd,
      feeUsd,
      netValueUsd,
    };
  });

  const validTrades = perTrade.filter(
    (t) => t.tokenSymbol !== 'Unknown' && t.grossValueUsd > 0,
  );

  const totalGrossValueUsd = validTrades.reduce((sum, t) => sum + t.grossValueUsd, 0);
  const totalNetValueUsd = validTrades.reduce((sum, t) => sum + t.netValueUsd, 0);
  const totalRealizedPnlUsd = totalNetValueUsd;

  return {
    totalRealizedPnlUsd,
    totalGrossValueUsd,
    totalNetValueUsd,
    perTrade: validTrades,
  };
}
