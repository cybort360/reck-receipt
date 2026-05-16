import type { SwapLeg } from './helius';

export interface EfficiencyAuditData {
  totalFeesSol: number;       // base transaction fees in SOL
  totalJitoTipsSol: number;   // Jito MEV tips in SOL
  avgSlippagePct: number;     // average slippage % across all swaps
  swaps: SwapLeg[];           // used to derive total traded volume in SOL
  pnl?: {
    winRate: number;          // 0-100 (from calculateRealizedPnl)
  };
}

export interface EfficiencyScoreResult {
  efficiencyScore: number;
  label: string;
}

function computeLabel(score: number): string {
  if (score >= 85) return 'Elite';
  if (score >= 70) return 'Sharp';
  if (score >= 50) return 'Average';
  return 'Sloppy';
}

export function computeEfficiencyScore(auditData: EfficiencyAuditData): EfficiencyScoreResult {
  const { totalFeesSol, totalJitoTipsSol, avgSlippagePct, swaps, pnl } = auditData;

  // Total traded volume = sum of SOL spent on buy-side legs (lamports → SOL)
  const totalVolumeSol =
    swaps
      .filter((l) => l.direction === 'buy' && l.solAmount > 0)
      .reduce((s, l) => s + l.solAmount, 0) / 1e9;

  const hasPnl = pnl !== undefined;

  // When no PnL data, redistribute its 25 points proportionally across the other three
  // base weights: fee=30, slip=25, jito=20 (total 75 without PnL)
  const feeMax  = hasPnl ? 30 : 30 + 25 * (30 / 75); // 30 or 40
  const slipMax = hasPnl ? 25 : 25 + 25 * (25 / 75); // 25 or ~33.33
  const jitoMax = hasPnl ? 20 : 20 + 25 * (20 / 75); // 20 or ~26.67
  const pnlMax  = hasPnl ? 25 : 0;

  // Component 1: fee-to-volume ratio (30 pts)
  // Total cost (fees + jito) / volume. 0 = full, 2%+ = 0. Linear between.
  let feeScore = feeMax;
  if (totalVolumeSol > 0) {
    const totalCostSol = totalFeesSol + totalJitoTipsSol;
    const feeRatio = totalCostSol / totalVolumeSol;
    feeScore = Math.max(0, 1 - feeRatio / 0.02) * feeMax;
  }

  // Component 2: slippage rate (25 pts)
  // 0% avg slippage = full, 3%+ = 0. Linear between.
  const slipScore = Math.max(0, 1 - avgSlippagePct / 3) * slipMax;

  // Component 3: Jito efficiency (20 pts)
  // 0 jito = full points. Penalty scales with jito / base fees; full penalty at 50%.
  let jitoScore = jitoMax;
  if (totalJitoTipsSol > 0) {
    const jitoPct = totalFeesSol > 0 ? totalJitoTipsSol / totalFeesSol : 1;
    const penalty = Math.min(jitoPct / 0.5, 1);
    jitoScore = (1 - penalty) * jitoMax;
  }

  // Component 4: PnL win rate (25 pts)
  // winRate 0-100 scales linearly to 0-pnlMax.
  const pnlScore = hasPnl ? (pnl.winRate / 100) * pnlMax : 0;

  const raw = feeScore + slipScore + jitoScore + pnlScore;
  const efficiencyScore = Math.min(100, Math.max(0, Math.round(raw)));

  return { efficiencyScore, label: computeLabel(efficiencyScore) };
}
