import type { SwapTransaction } from './helius';

interface Projection {
  dailyLeakageUsd: number;
  weeklyLeakageUsd: number;
  monthlyLeakageUsd: number;
  yearlyLeakageUsd: number;
  jupiterSavingsUsd: number;
}

export function calculateProjection(txs: SwapTransaction[], totalLeakageUsd: number): Projection {
  let days = 1;

  if (txs.length >= 2) {
    const timestamps = txs.map((tx) => tx.timestamp);
    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);
    const spanDays = (latest - earliest) / 86400;
    if (spanDays > 1) days = spanDays;
  }

  const dailyLeakageUsd = totalLeakageUsd / days;
  const weeklyLeakageUsd = dailyLeakageUsd * 7;
  const monthlyLeakageUsd = dailyLeakageUsd * 30;
  const yearlyLeakageUsd = dailyLeakageUsd * 365;
  const jupiterSavingsUsd = yearlyLeakageUsd * 0.3;

  return {
    dailyLeakageUsd,
    weeklyLeakageUsd,
    monthlyLeakageUsd,
    yearlyLeakageUsd,
    jupiterSavingsUsd,
  };
}
