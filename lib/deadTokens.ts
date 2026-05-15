import { getTokenMetadata } from './tokens';

const STABLECOIN_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);

export interface DeadToken {
  mint: string;
  symbol: string;
  balance: number;
  valueUsd: number;
}

interface HeliusTokenAccount {
  pubkey: string;
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          tokenAmount: {
            uiAmount: number | null;
            amount: string;
          };
        };
      };
    };
  };
}

interface JupiterPriceResponse {
  data: Record<string, { price: number } | null>;
}

export async function getDeadTokens(wallet: string): Promise<DeadToken[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY is not set');

  const rpcRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        wallet,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' },
      ],
    }),
  });

  if (!rpcRes.ok) throw new Error(`Helius RPC error: ${rpcRes.status}`);
  const rpcData = await rpcRes.json();
  const accounts: HeliusTokenAccount[] = rpcData.result?.value ?? [];

  const nonZero = accounts
    .map((a) => ({
      mint: a.account.data.parsed.info.mint,
      balance: a.account.data.parsed.info.tokenAmount.uiAmount ?? 0,
    }))
    .filter((t) => t.balance > 0);

  if (nonZero.length === 0) return [];

  const mints = nonZero.map((t) => t.mint);

  const [priceRes, tokenMetadata] = await Promise.all([
    fetch(`https://api.jup.ag/price/v2?ids=${mints.join(',')}`),
    getTokenMetadata(mints),
  ]);

  const priceData: JupiterPriceResponse = priceRes.ok ? await priceRes.json() : { data: {} };

  const dead: DeadToken[] = nonZero
    .map((t) => {
      const price = priceData.data?.[t.mint]?.price ?? 0;
      const valueUsd = t.balance * price;
      const symbol = tokenMetadata.get(t.mint)?.symbol ?? t.mint.slice(0, 4);
      return { mint: t.mint, symbol, balance: t.balance, valueUsd };
    })
    .filter((t) => t.valueUsd < 1 && !STABLECOIN_MINTS.has(t.mint))
    .sort((a, b) => a.valueUsd - b.valueUsd);

  return dead;
}
