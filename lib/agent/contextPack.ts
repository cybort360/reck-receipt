import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

// Minimal shapes — only the fields this module reads
interface StoredRektScore {
  score: number;
  grade: string;
  breakdown: {
    slippageEfficiency: number;
  };
}

interface StoredAudit {
  efficiencyScore?: number;
  efficiencyLabel?: string;
  realizedPnl?: {
    winRate: number;
  };
}

export interface SignalContext {
  provider: {
    wallet: string;
    score: number | null;
    grade: string | null;
    efficiencyLabel: string | null;
  };
  token: {
    mint: string;
    rugCount: number;
    traderCount: number;
    heldByTopWallets: boolean;
  };
  subscriber: {
    wallet: string;
    score: number | null;
    efficiencyScore: number | null;
    winRate: number | null;
    avgSlippage: number | null;
  };
}

export async function buildSignalContext(
  providerWallet: string,
  tokenMint: string,
  subscriberWallet: string,
): Promise<SignalContext> {
  const [
    providerRektScore,
    providerAudit,
    rugCount,
    traderCount,
    subscriberAudit,
    subscriberRektScore,
    top20Wallets,
    tokenTraders,
  ] = await Promise.all([
    // Provider — rektScore for score/grade, audit for efficiencyLabel
    redis.get<StoredRektScore>(KEYS.rektScore(providerWallet)).catch(() => null),
    redis.get<StoredAudit>(KEYS.audit(providerWallet)).catch(() => null),

    // Token — cardinality of each sorted set = unique wallet counts
    redis.zcard(KEYS.tokenRugs(tokenMint)).catch(() => 0),
    redis.zcard(KEYS.tokenTraders(tokenMint)).catch(() => 0),

    // Subscriber — audit for efficiencyScore/winRate, rektScore for score/avgSlippage
    redis.get<StoredAudit>(KEYS.audit(subscriberWallet)).catch(() => null),
    redis.get<StoredRektScore>(KEYS.rektScore(subscriberWallet)).catch(() => null),

    // Top 20 wallets by efficiency score (highest first)
    redis.zrange(KEYS.scoreIndex(), 0, 19, { rev: true })
      .then((r) => r as string[])
      .catch(() => [] as string[]),

    // All wallets that have ever traded this token
    redis.zrange(KEYS.tokenTraders(tokenMint), 0, -1)
      .then((r) => r as string[])
      .catch(() => [] as string[]),
  ]);

  // O(1) intersection check — any top-20 wallet also in this token's trader set
  const traderSet = new Set(tokenTraders);
  const heldByTopWallets = top20Wallets.some((w) => traderSet.has(w));

  return {
    provider: {
      wallet: providerWallet,
      score: providerRektScore?.score ?? null,
      grade: providerRektScore?.grade ?? null,
      efficiencyLabel: providerAudit?.efficiencyLabel ?? null,
    },
    token: {
      mint: tokenMint,
      rugCount: rugCount ?? 0,
      traderCount: traderCount ?? 0,
      heldByTopWallets,
    },
    subscriber: {
      wallet: subscriberWallet,
      score: subscriberRektScore?.score ?? null,
      efficiencyScore: subscriberAudit?.efficiencyScore ?? null,
      winRate: subscriberAudit?.realizedPnl?.winRate ?? null,
      // slippageEfficiency ≈ 100 - avgSlippage%, so invert to recover avg slippage
      avgSlippage: subscriberRektScore
        ? 100 - subscriberRektScore.breakdown.slippageEfficiency
        : null,
    },
  };
}
