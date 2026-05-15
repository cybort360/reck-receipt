export interface OvertradingResult {
  overtradedTokens: Array<{ symbol: string; mint: string; swapCount: number; feesUsd: number }>;
  totalOvertradingFeesUsd: number;
  overtradingSwapCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectOvertrading(tokenBreakdown: any[]): OvertradingResult {
  const overtraded = tokenBreakdown
    .filter((t) => t.swapCount > 3)
    .map((t) => ({
      symbol: t.symbol as string,
      mint: t.mint as string,
      swapCount: t.swapCount as number,
      feesUsd: t.totalFeesUsd as number,
    }))
    .sort((a, b) => b.swapCount - a.swapCount);

  const totalOvertradingFeesUsd = overtraded.reduce((sum, t) => sum + t.feesUsd, 0);
  const overtradingSwapCount = overtraded.reduce((sum, t) => sum + t.swapCount, 0);

  return { overtradedTokens: overtraded, totalOvertradingFeesUsd, overtradingSwapCount };
}
