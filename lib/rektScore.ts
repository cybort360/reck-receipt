import type { TokenBreakdownEntry } from './fees';
import type { OvertradingResult } from './overtrading';
import type { DeadToken } from './deadTokens';
import type { PnlResult } from './pnl';

interface AuditData {
  totalLeakageUsd: number;
  transactionCount: number;
  tokenBreakdown: TokenBreakdownEntry[];
  overtrading: OvertradingResult | null | undefined;
  deadTokens: DeadToken[];
  pnl?: PnlResult;
}

interface RektScoreBreakdown {
  winRate: number;
  slippageEfficiency: number;
  disciplineScore: number;
  rugResilience: number;
  bagHealth: number;
}

export interface RektScore {
  score: number;
  grade: string;
  breakdown: RektScoreBreakdown;
}

function computeGrade(score: number): string {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

export function computeRektScore(auditData: AuditData): RektScore {
  const { totalLeakageUsd, transactionCount, tokenBreakdown, overtrading, deadTokens, pnl } = auditData;

  // winRate: profitable tokens / total tokens traded (0-100)
  let winRate: number;
  if (tokenBreakdown.length === 0) {
    winRate = 0;
  } else if (pnl) {
    const tokenNetMap = new Map<string, number>();
    for (const trade of pnl.perTrade) {
      tokenNetMap.set(trade.tokenSymbol, (tokenNetMap.get(trade.tokenSymbol) ?? 0) + trade.netValueUsd);
    }
    const profitable = [...tokenNetMap.values()].filter((net) => net > 0).length;
    winRate = Math.round((profitable / tokenBreakdown.length) * 100);
  } else {
    winRate = 50;
  }

  // slippageEfficiency: 100 - avg slippage%, capped so result stays 0-100
  let slippageEfficiency: number;
  if (pnl && pnl.totalGrossValueUsd > 0) {
    const avgSlippagePct = (totalLeakageUsd / pnl.totalGrossValueUsd) * 100;
    slippageEfficiency = Math.round(Math.max(0, 100 - Math.min(100, avgSlippagePct)));
  } else if (transactionCount > 0) {
    // fallback: $5 avg leakage per trade ≈ 100% slippage on this scale
    const avgLeakagePerTrade = totalLeakageUsd / transactionCount;
    slippageEfficiency = Math.round(Math.max(0, 100 - Math.min(100, avgLeakagePerTrade * 20)));
  } else {
    slippageEfficiency = 100;
  }

  // disciplineScore: 100 - 15 per overtraded token, min 0
  const overtradedCount = overtrading?.overtradedTokens.length ?? 0;
  const disciplineScore = Math.max(0, 100 - overtradedCount * 15);

  // rugResilience: 100 - 20 per rug hit, min 0
  const rugResilience = Math.max(0, 100 - deadTokens.length * 20);

  // bagHealth: 100 - (dead bag value / total fees paid * 100), percentage capped at 100
  let bagHealth: number;
  if (totalLeakageUsd > 0) {
    const deadBagValue = deadTokens.reduce((sum, t) => sum + t.valueUsd, 0);
    const pct = (deadBagValue / totalLeakageUsd) * 100;
    bagHealth = Math.round(Math.max(0, 100 - Math.min(100, pct)));
  } else {
    bagHealth = 100;
  }

  const score = Math.round(
    (winRate / 100) * 30 +
      (slippageEfficiency / 100) * 20 +
      (disciplineScore / 100) * 20 +
      (rugResilience / 100) * 15 +
      (bagHealth / 100) * 15,
  );

  return {
    score,
    grade: computeGrade(score),
    breakdown: { winRate, slippageEfficiency, disciplineScore, rugResilience, bagHealth },
  };
}
