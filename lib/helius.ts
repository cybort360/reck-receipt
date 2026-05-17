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

interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint: string;
}

interface HeliusTokenBalanceChange {
  userAccount: string;
  tokenAccount: string;
  mint: string;
  rawTokenAmount: {
    tokenAmount: string;
    decimals: number;
  };
}

interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: HeliusTokenBalanceChange[];
}

interface HeliusEnhancedTransaction {
  signature: string;
  timestamp: number;
  fee: number;
  nativeTransfers: HeliusNativeTransfer[];
  tokenTransfers: HeliusTokenTransfer[];
  accountData: HeliusAccountData[];
}

export interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint: string;
}

export interface AccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: {
      tokenAmount: string;
      decimals: number;
    };
  }>;
}

export interface SwapLeg {
  mint: string;
  direction: 'buy' | 'sell';
  solAmount: number;   // lamports (raw native balance change magnitude)
  tokenAmount: number; // raw token amount from tokenTransfers
  timestamp: number;   // unix seconds
}

export interface SwapTransaction {
  signature: string;
  timestamp: number;
  fee: number;
  hasJitoTip: boolean;
  jitoTipLamports: number;
  slippagePct: number;
  likelySandwiched: boolean;
  tokenTransfers: TokenTransfer[];
  accountData: AccountData[];
  legs: SwapLeg[];
}

function extractLegs(
  walletAddress: string,
  tokenTransfers: HeliusTokenTransfer[],
  accountData: HeliusAccountData[],
  fee: number,
  timestamp: number,
): SwapLeg[] {
  const walletAccount = accountData.find((a) => a.account === walletAddress);
  const nativeChange = walletAccount?.nativeBalanceChange ?? 0;

  const tokensIn = tokenTransfers.filter((t) => t.toUserAccount === walletAddress);
  const tokensOut = tokenTransfers.filter((t) => t.fromUserAccount === walletAddress);

  if (tokensIn.length === 0 && tokensOut.length === 0) return [];

  // Significant SOL movement means SOL is one side of the swap
  const solMoved = Math.abs(nativeChange) > fee;

  if (solMoved && nativeChange < 0 && tokensIn.length > 0) {
    // SOL → Token (buy)
    const primary = tokensIn.reduce((a, b) => (b.tokenAmount > a.tokenAmount ? b : a));
    return [{ mint: primary.mint, direction: 'buy', solAmount: Math.abs(nativeChange), tokenAmount: primary.tokenAmount, timestamp }];
  }

  if (solMoved && nativeChange > 0 && tokensOut.length > 0) {
    // Token → SOL (sell)
    const primary = tokensOut.reduce((a, b) => (b.tokenAmount > a.tokenAmount ? b : a));
    return [{ mint: primary.mint, direction: 'sell', solAmount: nativeChange, tokenAmount: primary.tokenAmount, timestamp }];
  }

  // Token → Token: represent as buy of received token with solAmount = 0
  if (tokensIn.length > 0) {
    const primary = tokensIn.reduce((a, b) => (b.tokenAmount > a.tokenAmount ? b : a));
    return [{ mint: primary.mint, direction: 'buy', solAmount: 0, tokenAmount: primary.tokenAmount, timestamp }];
  }

  return [];
}

function mapHeliusTx(tx: HeliusEnhancedTransaction, walletAddress: string): SwapTransaction {
  const nativeTransfers = tx.nativeTransfers ?? [];
  const tokenTransfers = tx.tokenTransfers ?? [];

  const jitoTipLamports = nativeTransfers
    .filter((t) => JITO_TIP_ACCOUNTS.has(t.toUserAccount))
    .reduce((sum, t) => sum + t.amount, 0);
  const hasJitoTip = jitoTipLamports > 0;

  const outgoing = tokenTransfers
    .filter((t) => t.fromUserAccount === walletAddress)
    .reduce((max, t) => Math.max(max, t.tokenAmount), 0);
  const incoming = tokenTransfers
    .filter((t) => t.toUserAccount === walletAddress)
    .reduce((max, t) => Math.max(max, t.tokenAmount), 0);
  const slippagePct =
    outgoing > 0 && incoming > 0
      ? Math.max(0, ((outgoing - incoming) / outgoing) * 100)
      : 0;

  const likelySandwiched = hasJitoTip && jitoTipLamports > 100000;
  const accountData = tx.accountData ?? [];

  return {
    signature: tx.signature,
    timestamp: tx.timestamp,
    fee: tx.fee,
    hasJitoTip,
    jitoTipLamports,
    slippagePct,
    likelySandwiched,
    tokenTransfers,
    accountData,
    legs: extractLegs(walletAddress, tx.tokenTransfers ?? [], accountData, tx.fee, tx.timestamp),
  };
}

export async function fetchSwapTransactions(walletAddress: string, max = 500): Promise<SwapTransaction[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY is not set');

  const MAX = max;
  const allTxs: HeliusEnhancedTransaction[] = [];
  let before: string | null = null;

  while (allTxs.length < MAX) {
    const baseUrl = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${apiKey}&limit=100&type=SWAP`;
    const url = before ? `${baseUrl}&before=${before}` : baseUrl;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Helius API error: ${res.status}`);

    const page: HeliusEnhancedTransaction[] = await res.json();
    allTxs.push(...page);

    if (page.length < 100) break;
    before = page[page.length - 1].signature;
  }

  return allTxs.slice(0, MAX).map((tx) => mapHeliusTx(tx, walletAddress));
}

export async function fetchSwapTransactionsByMonth(
  walletAddress: string,
  year: number,
  month: number,
): Promise<SwapTransaction[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY is not set');

  const monthStart = Math.floor(Date.UTC(year, month - 1, 1) / 1000);
  const monthEnd = Math.floor(Date.UTC(year, month, 1) / 1000);

  const collected: HeliusEnhancedTransaction[] = [];
  let before: string | null = null;

  while (true) {
    const base = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${apiKey}&limit=100&type=SWAP`;
    const url = before ? `${base}&before=${before}` : base;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Helius API error: ${res.status}`);
    const page: HeliusEnhancedTransaction[] = await res.json();
    if (page.length === 0) break;

    for (const tx of page) {
      if (tx.timestamp >= monthStart && tx.timestamp < monthEnd) {
        collected.push(tx);
      }
    }

    const oldestTs = page[page.length - 1].timestamp;
    if (oldestTs < monthStart || page.length < 100) break;
    before = page[page.length - 1].signature;
  }

  return collected.map((tx) => mapHeliusTx(tx, walletAddress));
}
