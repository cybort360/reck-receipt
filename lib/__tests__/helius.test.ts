import { fetchSwapTransactions } from '../helius';

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
    expect(result[0]).toEqual({
      signature: 'sig1abc',
      timestamp: 1715000000,
      fee: 5000,
      hasJitoTip: true,
      jitoTipLamports: 1500000,
    });
    expect(result[1]).toEqual({
      signature: 'sig2def',
      timestamp: 1715001000,
      fee: 7500,
      hasJitoTip: false,
      jitoTipLamports: 0,
    });
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
