import { cache } from 'react';
import Link from 'next/link';
import { fetchSwapTransactions } from '@/lib/helius';
import { calculateLeakage, type LeakageSummary } from '@/lib/fees';
import { getSolPrice } from '@/lib/price';

const getAuditData = cache(async (wallet: string): Promise<LeakageSummary> => {
  const [txs, solPriceUsd] = await Promise.all([
    fetchSwapTransactions(wallet),
    getSolPrice(),
  ]);
  return calculateLeakage(txs, solPriceUsd);
});

function getGrade(usd: number): { grade: string; color: string } {
  if (usd < 1) return { grade: 'A', color: 'text-green-400' };
  if (usd < 5) return { grade: 'B', color: 'text-green-400' };
  if (usd < 20) return { grade: 'C', color: 'text-yellow-400' };
  if (usd < 50) return { grade: 'D', color: 'text-red-400' };
  return { grade: 'F', color: 'text-red-400' };
}

function truncateWallet(address: string): string {
  return `${address.slice(0, 1)}••••••••••••`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm font-mono">
      <span className="text-[#666]">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;
  try {
    const summary = await getAuditData(wallet);
    const { grade } = getGrade(summary.totalLeakageUsd);
    return {
      title: 'My RektReceipt',
      description: `I got grade ${grade} and leaked $${summary.totalLeakageUsd.toFixed(2)} — check yours.`,
    };
  } catch {
    return {
      title: 'My RektReceipt',
      description: 'Find out how much Solana has taken from you.',
    };
  }
}

export default async function SharePage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;

  let summary: LeakageSummary;
  try {
    summary = await getAuditData(wallet);
  } catch {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-[#666] text-sm font-mono">Failed to load receipt for this wallet.</p>
          <Link href="/" className="text-[#14f195] text-sm font-mono hover:underline">
            Check yours →
          </Link>
        </div>
      </main>
    );
  }

  const { grade, color } = getGrade(summary.totalLeakageUsd);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16 flex flex-col items-center justify-center gap-8">
      <div className="w-full max-w-sm flex flex-col gap-3">
        <div className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight font-mono">RektReceipt</h1>
          <p className="text-[#666] text-sm mt-1">Find out how much Solana has taken from you.</p>
        </div>

        <div className="border border-dashed border-[#2a2a2a] rounded-lg bg-[#111] p-5">
          <p className="text-[#14f195] text-xs tracking-widest font-mono mb-4">RECEIPT</p>
          <div className="flex flex-col divide-y divide-[#1a1a1a]">
            <Row label="Wallet" value={truncateWallet(wallet)} />
            <Row label="Swaps analyzed" value={String(summary.transactionCount)} />
            <Row label="Total fees" value={`${summary.totalFeesSol.toFixed(4)} SOL`} />
            <Row
              label="Jito tips"
              value={`${summary.totalJitoTips} txns · ${summary.totalJitoTipsSol.toFixed(4)} SOL`}
            />
            <div className="flex justify-between py-2 text-sm font-mono">
              <span className="text-[#666]">Execution grade</span>
              <span className={`font-bold ${color}`}>{grade}</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline mt-4 pt-4">
            <span className="text-[#666] text-xs tracking-widest font-mono">TOTAL REKT</span>
            <span className="text-red-400 font-bold text-lg">
              ${summary.totalLeakageUsd.toFixed(2)}
            </span>
          </div>
        </div>

        <Link
          href="/"
          className="w-full border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] py-2 rounded text-sm font-mono transition-colors text-center"
        >
          Check yours →
        </Link>
      </div>
    </main>
  );
}
