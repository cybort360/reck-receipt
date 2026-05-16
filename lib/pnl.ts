import type { SwapTransaction, SwapLeg } from './helius';
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

export interface RealizedPnlResult {
  totalRealizedSOL: number;
  closedPositions: number;
  winRate: number;        // 0-100
  avgPnlPerTrade: number; // SOL
}

export function calculateRealizedPnl(swaps: SwapLeg[]): RealizedPnlResult {
  // Group legs by token mint
  const byMint = new Map<string, { buys: SwapLeg[]; sells: SwapLeg[] }>();
  for (const leg of swaps) {
    if (!byMint.has(leg.mint)) byMint.set(leg.mint, { buys: [], sells: [] });
    const group = byMint.get(leg.mint)!;
    if (leg.direction === 'buy') group.buys.push(leg); else group.sells.push(leg);
  }

  let totalRealizedSOL = 0;
  let closedPositions = 0;
  let wins = 0;

  for (const { buys, sells } of byMint.values()) {
    // Skip tokens never sold (wallet still holds entirely)
    if (sells.length === 0) continue;
    // Skip tokens never bought in this window (no cost basis to work from)
    if (buys.length === 0) continue;

    const totalBoughtTokens = buys.reduce((s, l) => s + l.tokenAmount, 0);
    const totalSolSpentLamports = buys.reduce((s, l) => s + l.solAmount, 0);
    const totalSoldTokens = sells.reduce((s, l) => s + l.tokenAmount, 0);
    const totalSolReceivedLamports = sells.reduce((s, l) => s + l.solAmount, 0);

    if (totalBoughtTokens === 0) continue;

    // Proportional cost basis: (amountSold / totalBought) * totalSolSpent
    // Cap proportion at 1 to handle sells that exceed the audited buy window
    const proportion = Math.min(totalSoldTokens / totalBoughtTokens, 1);
    const costBasisLamports = proportion * totalSolSpentLamports;

    const realizedSOL = (totalSolReceivedLamports - costBasisLamports) / 1e9;

    totalRealizedSOL += realizedSOL;
    closedPositions += 1;
    if (realizedSOL > 0) wins += 1;
  }

  return {
    totalRealizedSOL,
    closedPositions,
    winRate: closedPositions > 0 ? (wins / closedPositions) * 100 : 0,
    avgPnlPerTrade: closedPositions > 0 ? totalRealizedSOL / closedPositions : 0,
  };
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
