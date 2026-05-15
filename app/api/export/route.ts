import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint: string;
}

interface CachedTx {
  signature: string;
  timestamp: number;
  fee: number;
  jitoTipLamports: number;
  hasJitoTip: boolean;
  tokenTransfers: TokenTransfer[];
}

interface CachedAudit {
  totalLeakageUsd: number;
  totalLeakageSol: number;
  txs: CachedTx[];
}

function calculateGrade(usd: number): string {
  if (usd < 1) return 'A';
  if (usd < 5) return 'B';
  if (usd < 20) return 'C';
  if (usd < 50) return 'D';
  return 'F';
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  const cached = await redis.get(KEYS.audit(wallet));
  if (!cached) {
    return NextResponse.json({ error: 'Please audit this wallet first' }, { status: 400 });
  }

  return Response.json({ cached: JSON.stringify(cached as object).slice(0, 500) });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: CachedAudit = typeof cached === 'string' ? JSON.parse(cached as any) : (cached as CachedAudit);
  const grade = calculateGrade(data.totalLeakageUsd);
  const solPrice = data.totalLeakageSol > 0 ? data.totalLeakageUsd / data.totalLeakageSol : 0;
  const rows = data.txs ?? [];

  const header = 'Date,Signature,Token,Fees SOL,Fees USD,Jito Tip SOL,Grade';
  const lines = rows.map((tx) => {
    const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0];
    const feeSol = tx.fee / 1e9;
    const feeUsd = feeSol * solPrice;
    const jitoTipSol = tx.jitoTipLamports / 1e9;

    const largestIncoming = (tx.tokenTransfers ?? [])
      .filter((t) => t.toUserAccount === wallet)
      .reduce<TokenTransfer | null>(
        (best, t) => (best === null || t.tokenAmount > best.tokenAmount ? t : best),
        null,
      );
    const token = largestIncoming ? largestIncoming.mint.slice(0, 4) : 'UNKN';

    return [
      escapeCsv(date),
      escapeCsv(tx.signature),
      escapeCsv(token),
      feeSol.toFixed(6),
      feeUsd.toFixed(4),
      jitoTipSol.toFixed(6),
      grade,
    ].join(',');
  });

  const csv = [header, ...lines].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=rektreceipt-${wallet}-export.csv`,
    },
  });
}
