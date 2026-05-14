interface HeliusTokenMetadata {
  account: string;
  onChainMetadata?: {
    metadata?: {
      data?: {
        symbol?: string;
        name?: string;
      };
    };
  };
  offChainMetadata?: {
    metadata?: {
      symbol?: string;
      name?: string;
    };
  };
}

export async function getTokenMetadata(
  mints: string[],
): Promise<Map<string, { symbol: string; name: string }>> {
  const result = new Map<string, { symbol: string; name: string }>();
  if (mints.length === 0) return result;

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY is not set');

  try {
    const res = await fetch(
      `https://api.helius.xyz/v0/token-metadata?api-key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mintAccounts: mints, includeOffChain: true, disableCache: false }),
      },
    );

    if (!res.ok) throw new Error(`Helius token-metadata error: ${res.status}`);

    const data: HeliusTokenMetadata[] = await res.json();

    for (const item of data) {
      const onChain = item.onChainMetadata?.metadata?.data;
      const offChain = item.offChainMetadata?.metadata;
      const symbol =
        onChain?.symbol?.trim() ||
        offChain?.symbol?.trim() ||
        item.account.slice(0, 4);
      const name =
        onChain?.name?.trim() ||
        offChain?.name?.trim() ||
        item.account.slice(0, 4);
      result.set(item.account, { symbol, name });
    }
  } catch {
    // fall back: callers will get empty map entries and use mint slice as symbol
  }

  for (const mint of mints) {
    if (!result.has(mint)) {
      result.set(mint, { symbol: mint.slice(0, 4), name: mint.slice(0, 4) });
    }
  }

  return result;
}
