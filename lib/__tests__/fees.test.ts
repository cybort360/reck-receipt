import { calculateLeakage } from '../fees';
import type { SwapTransaction } from '../helius';

jest.mock('../price', () => ({
  getSolPriceAtTimestamp: jest.fn().mockResolvedValue(150),
}));

const txs: SwapTransaction[] = [
  { signature: 'a', timestamp: 1, fee: 5000, hasJitoTip: true, jitoTipLamports: 2000000, slippagePct: 0.5, likelySandwiched: true, tokenTransfers: [] },
  { signature: 'b', timestamp: 2, fee: 10000, hasJitoTip: false, jitoTipLamports: 0, slippagePct: 0, likelySandwiched: false, tokenTransfers: [] },
  { signature: 'c', timestamp: 3, fee: 7500, hasJitoTip: true, jitoTipLamports: 1500000, slippagePct: 1.2, likelySandwiched: true, tokenTransfers: [] },
];

describe('calculateLeakage', () => {
  it('returns correct counts and sums', async () => {
    const result = await calculateLeakage(txs);

    expect(result.transactionCount).toBe(3);
    expect(result.totalJitoTips).toBe(2);
    expect(result.totalFeesSol).toBeCloseTo(0.0000225);
    expect(result.totalJitoTipsSol).toBeCloseTo(0.0035);
    expect(result.totalLeakageSol).toBeCloseTo(0.0035225);
    expect(result.totalLeakageUsd).toBeCloseTo(0.0035225 * 150);
  });

  it('returns zeros for an empty array', async () => {
    const result = await calculateLeakage([]);

    expect(result).toEqual({
      totalFeesSol: 0,
      totalJitoTips: 0,
      totalJitoTipsSol: 0,
      totalLeakageSol: 0,
      totalLeakageUsd: 0,
      transactionCount: 0,
      sandwichCount: 0,
    });
  });
});
