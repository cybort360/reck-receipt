import { NextRequest } from 'next/server';
import { POST } from '../route';

jest.mock('@/lib/redis', () => ({
  redis: {
    smembers: jest.fn().mockResolvedValue(['wallet1', 'wallet2']),
  },
}));

jest.mock('@/lib/wrapped', () => ({
  generateWrapped: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/telegram', () => ({
  getTelegramChatId: jest.fn().mockResolvedValue('chat123'),
  sendTelegramMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/redis/keys', () => ({
  KEYS: {
    proWallets: jest.fn().mockReturnValue('rr:v1:idx:pro-wallets'),
  },
}));

const makeReq = (secret?: string) =>
  new Request('http://localhost/api/cron/generate-wrapped', {
    method: 'POST',
    headers: secret ? { 'x-admin-secret': secret } : {},
  }) as unknown as NextRequest;

beforeAll(() => {
  process.env.ADMIN_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  const { redis } = require('@/lib/redis');
  redis.smembers.mockResolvedValue(['wallet1', 'wallet2']);
  const { generateWrapped } = require('@/lib/wrapped');
  generateWrapped.mockResolvedValue(undefined);
  const { getTelegramChatId, sendTelegramMessage } = require('@/lib/telegram');
  getTelegramChatId.mockResolvedValue('chat123');
  sendTelegramMessage.mockResolvedValue(undefined);
});

describe('POST /api/cron/generate-wrapped', () => {
  it('returns 401 if x-admin-secret header is missing', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 if x-admin-secret header is wrong', async () => {
    const res = await POST(makeReq('wrong-secret'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('calls generateWrapped for each Pro wallet and returns correct counts', async () => {
    const { generateWrapped } = require('@/lib/wrapped');
    const { getTelegramChatId, sendTelegramMessage } = require('@/lib/telegram');

    const res = await POST(makeReq('test-secret'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(generateWrapped).toHaveBeenCalledTimes(2);
    expect(body.generated).toBe(2);
    expect(body.notified).toBe(2);
    expect(body.errors).toBe(0);
    expect(body.total).toBe(2);
    expect(getTelegramChatId).toHaveBeenCalledWith('wallet1');
    expect(getTelegramChatId).toHaveBeenCalledWith('wallet2');
    expect(sendTelegramMessage).toHaveBeenCalledTimes(2);
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      'chat123',
      expect.stringContaining('rektreceipt.xyz/wrapped/wallet1/'),
    );
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      'chat123',
      expect.stringContaining('rektreceipt.xyz/wrapped/wallet2/'),
    );
  });

  it('continues processing remaining wallets if one wallet generateWrapped throws', async () => {
    const { generateWrapped } = require('@/lib/wrapped');
    generateWrapped.mockRejectedValueOnce(new Error('Helius timeout'));

    const res = await POST(makeReq('test-secret'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.generated).toBe(1);
    expect(body.errors).toBe(1);
    expect(body.total).toBe(2);
  });
});
