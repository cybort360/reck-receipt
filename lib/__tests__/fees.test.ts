import { calculateLeakage } from '../fees';
import type { SwapTransaction } from '../helius';

const txs: SwapTransaction[] = [
  { signature: 'a', timestamp: 1, fee: 5000, hasJitoTip: true, jitoTipLamports: 2000000 },
  { signature: 'b', timestamp: 2, fee: 10000, hasJitoTip: false, jitoTipLamports: 0 },
  { signature: 'c', timestamp: 3, fee: 7500, hasJitoTip: true, jitoTipLamports: 1500000 },
];

describe('calculateLeakage', () => {
  it('returns correct counts and sums', () => {
    const result = calculateLeakage(txs, 150);

    expect(result.transactionCount).toBe(3);
    expect(result.totalJitoTips).toBe(2);
    expect(result.totalFeesSol).toBeCloseTo(0.0000225);
    expect(result.totalJitoTipsSol).toBeCloseTo(0.0035);
    expect(result.totalLeakageSol).toBeCloseTo(0.0035225);
    expect(result.totalLeakageUsd).toBeCloseTo(0.0035225 * 150);
  });

  it('returns zeros for an empty array', () => {
    const result = calculateLeakage([], 100);

    expect(result).toEqual({
      totalFeesSol: 0,
      totalJitoTips: 0,
      totalJitoTipsSol: 0,
      totalLeakageSol: 0,
      totalLeakageUsd: 0,
      transactionCount: 0,
    });
  });
});
