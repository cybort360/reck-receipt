import { fetchSwapTransactions, fetchSwapTransactionsByMonth } from '../helius';

const mockTxs = [
  {
    signature: 'sig1abc',
    timestamp: 1715000000,
    fee: 5000,
    nativeTransfers: [
      { fromUserAccount: 'walletA', toUserAccount: '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5', amount: 1000000 },
      { fromUserAccount: 'walletA', toUserAccount: 'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt', amount: 500000 },
    ],
  },
  {
    signature: 'sig2def',
    timestamp: 1715001000,
    fee: 7500,
    nativeTransfers: [
      { fromUserAccount: 'walletA', toUserAccount: 'someRandomAccount', amount: 500000 },
    ],
  },
];

beforeEach(() => {
  process.env.HELIUS_API_KEY = 'test-key';
});

afterEach(() => {
  jest.resetAllMocks();
  delete process.env.HELIUS_API_KEY;
});

describe('fetchSwapTransactions', () => {
  it('returns mapped transactions with correct shape', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTxs,
    } as Response);

    const result = await fetchSwapTransactions('walletA');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(expect.objectContaining({
      signature: 'sig1abc',
      timestamp: 1715000000,
      fee: 5000,
      hasJitoTip: true,
      jitoTipLamports: 1500000,
    }));
    expect(result[1]).toEqual(expect.objectContaining({
      signature: 'sig2def',
      timestamp: 1715001000,
      fee: 7500,
      hasJitoTip: false,
      jitoTipLamports: 0,
    }));
  });

  it('calls Helius with correct URL params', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchSwapTransactions('myWallet123');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.helius.xyz/v0/addresses/myWallet123/transactions?api-key=test-key&limit=100&type=SWAP'
    );
  });

  it('throws when Helius returns a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    await expect(fetchSwapTransactions('walletA')).rejects.toThrow('Helius API error: 429');
  });

  it('throws when HELIUS_API_KEY is missing', async () => {
    delete process.env.HELIUS_API_KEY;

    await expect(fetchSwapTransactions('walletA')).rejects.toThrow('HELIUS_API_KEY is not set');
  });
});

describe('fetchSwapTransactionsByMonth', () => {
  it('returns only txs within the calendar month', async () => {
    // May 2026: monthStart = 1746057600, monthEnd = 1748736000
    const mayStart = Math.floor(Date.UTC(2026, 4, 1) / 1000);  // 1746057600
    const mayEnd   = Math.floor(Date.UTC(2026, 5, 1) / 1000);  // 1748736000

    const inMonth = { ...mockTxs[0], timestamp: mayStart + 1000 };
    const beforeMonth = { ...mockTxs[0], signature: 'before', timestamp: mayStart - 1 };
    const afterMonth  = { ...mockTxs[0], signature: 'after',  timestamp: mayEnd + 1 };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [afterMonth, inMonth, beforeMonth],
    } as Response);

    const result = await fetchSwapTransactionsByMonth('walletA', 2026, 5);

    expect(result).toHaveLength(1);
    expect(result[0].signature).toBe(inMonth.signature);
    expect(result[0].timestamp).toBe(inMonth.timestamp);
  });

  it('stops paginating when oldest tx is before month start', async () => {
    const mayStart = Math.floor(Date.UTC(2026, 4, 1) / 1000);

    const page1 = Array.from({ length: 100 }, (_, i) => ({
      ...mockTxs[0],
      signature: `sig-p1-${i}`,
      timestamp: mayStart + (100 - i) * 100,
    }));
    const page2 = [{ ...mockTxs[0], signature: 'old', timestamp: mayStart - 500 }];

    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => page1 } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => page2 } as Response);

    await fetchSwapTransactionsByMonth('walletA', 2026, 5);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
