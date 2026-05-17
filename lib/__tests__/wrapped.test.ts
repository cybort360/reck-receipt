import { generateWrapped } from '../wrapped';

jest.mock('../helius', () => ({
  fetchSwapTransactionsByMonth: jest.fn().mockResolvedValue([
    {
      signature: 'sig1',
      timestamp: 1746100000,
      fee: 5000,
      hasJitoTip: true,
      jitoTipLamports: 1000000,
      slippagePct: 1.5,
      likelySandwiched: false,
      tokenTransfers: [
        { fromUserAccount: '', toUserAccount: 'wallet1', tokenAmount: 1000, mint: 'mint1' },
      ],
      accountData: [{ account: 'wallet1', nativeBalanceChange: -500000000, tokenBalanceChanges: [] }],
      legs: [{ mint: 'mint1', direction: 'buy', solAmount: 500000000, tokenAmount: 1000, timestamp: 1746100000 }],
    },
  ]),
}));

jest.mock('../fees', () => ({
  calculateLeakage: jest.fn().mockResolvedValue({
    totalFeesSol: 0.000005,
    totalJitoTips: 1,
    totalJitoTipsSol: 0.001,
    totalLeakageSol: 0.001005,
    totalLeakageUsd: 0.15,
    transactionCount: 1,
    sandwichCount: 0,
  }),
  calculateTokenBreakdown: jest.fn().mockReturnValue([
    { mint: 'mint1', symbol: 'BONK', totalFeesUsd: 0.15, swapCount: 1 },
  ]),
}));

jest.mock('../tokens', () => ({
  getTokenMetadata: jest.fn().mockResolvedValue(new Map([['mint1', { symbol: 'BONK', name: 'Bonk' }]])),
}));

jest.mock('../price', () => ({
  getSolPriceAtTimestamp: jest.fn().mockResolvedValue(150),
}));

jest.mock('../deadTokens', () => ({
  getDeadTokens: jest.fn().mockResolvedValue([]),
}));

jest.mock('../rektScore', () => ({
  computeRektScore: jest.fn().mockReturnValue({ score: 42, grade: 'C', breakdown: {} }),
}));

jest.mock('../personality', () => ({
  getTraderPersonality: jest.fn().mockReturnValue({
    title: 'Chaos Trader',
    description: 'You trade like the market owes you something.',
    emoji: '🌀',
  }),
}));

jest.mock('../auditWallet', () => ({
  calculateGrade: jest.fn().mockReturnValue('C'),
}));

jest.mock('../redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    zcard: jest.fn().mockResolvedValue(10),
    zrank: jest.fn().mockResolvedValue(3),
  },
}));

describe('generateWrapped', () => {
  it('returns a WrappedData object with correct shape', async () => {
    const result = await generateWrapped('wallet1', 2026, 5);

    expect(result.wallet).toBe('wallet1');
    expect(result.year).toBe(2026);
    expect(result.month).toBe(5);
    expect(result.swapCount).toBe(1);
    expect(result.totalFeesUsd).toBe(0.15);
    expect(result.grade).toBe('C');
    expect(result.rektScore).toBe(42);
    expect(result.personality.type).toBe('Chaos Trader');
    expect(result.worstTrade).not.toBeNull();
    expect(result.worstTrade?.symbol).toBe('BONK');
    // zrank=3, zcard=10 → Math.round(3/10*100) = 30
    expect(result.communityPercentile).toBe(30);
    expect(result.generatedAt).toBeGreaterThan(0);
  });

  it('returns null communityPercentile when fewer than 3 peers', async () => {
    const { redis } = require('../redis');
    redis.zcard.mockResolvedValueOnce(2);

    const result = await generateWrapped('wallet1', 2026, 5);
    expect(result.communityPercentile).toBeNull();
  });

  it('returns null worstTrade when no txs have legs', async () => {
    const { fetchSwapTransactionsByMonth } = require('../helius');
    fetchSwapTransactionsByMonth.mockResolvedValueOnce([
      {
        signature: 'sig2',
        timestamp: 1746100000,
        fee: 5000,
        hasJitoTip: false,
        jitoTipLamports: 0,
        slippagePct: 0,
        likelySandwiched: false,
        tokenTransfers: [],
        accountData: [],
        legs: [],
      },
    ]);

    const result = await generateWrapped('wallet1', 2026, 5);
    expect(result.worstTrade).toBeNull();
  });
});
