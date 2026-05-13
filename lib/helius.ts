const JITO_TIP_ACCOUNTS = new Set([
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvB8uyLLHLCQMeoKSXF5jFoFNNNNBBHhBX',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9sMNtQbEe9jcieSkiPhqa2iqjAKEy7AQdPMRH',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6dW',
]);

interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

interface HeliusEnhancedTransaction {
  signature: string;
  timestamp: number;
  fee: number;
  nativeTransfers: HeliusNativeTransfer[];
}

export interface SwapTransaction {
  signature: string;
  timestamp: number;
  fee: number;
  hasJitoTip: boolean;
  jitoTipLamports: number;
}

export async function fetchSwapTransactions(walletAddress: string): Promise<SwapTransaction[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY is not set');

  const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${apiKey}&limit=100&type=SWAP`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Helius API error: ${res.status}`);

  const txs: HeliusEnhancedTransaction[] = await res.json();

  return txs.map((tx) => {
    const transfers = tx.nativeTransfers ?? [];
    const jitoTipLamports = transfers
      .filter((t) => JITO_TIP_ACCOUNTS.has(t.toUserAccount))
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      signature: tx.signature,
      timestamp: tx.timestamp,
      fee: tx.fee,
      hasJitoTip: jitoTipLamports > 0,
      jitoTipLamports,
    };
  });
}
