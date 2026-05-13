import { getSolPrice } from '../price';

afterEach(() => jest.resetAllMocks());

describe('getSolPrice', () => {
  it('returns the price from CoinGecko', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ solana: { usd: 182.5 } }),
    } as Response);

    expect(await getSolPrice()).toBe(182.5);
  });

  it('returns 150 when the response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 } as Response);

    expect(await getSolPrice()).toBe(150);
  });

  it('returns 150 when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

    expect(await getSolPrice()).toBe(150);
  });
});
