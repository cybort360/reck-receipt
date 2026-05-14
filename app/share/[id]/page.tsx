import { cache } from 'react';
import Link from 'next/link';
import { redis } from '@/lib/redis';
import type { LeakageSummary } from '@/lib/fees';

interface ReceiptData extends LeakageSummary {
  wallet: string;
}

const getReceipt = cache(async (id: string): Promise<ReceiptData | null> => {
  return redis.get<ReceiptData>(`receipt:${id}`);
});

function getGrade(usd: number): { grade: string; color: string } {
  if (usd < 1) return { grade: 'A', color: 'text-green-400' };
  if (usd < 5) return { grade: 'B', color: 'text-green-400' };
  if (usd < 20) return { grade: 'C', color: 'text-yellow-400' };
  if (usd < 50) return { grade: 'D', color: 'text-red-400' };
  return { grade: 'F', color: 'text-red-400' };
}

function maskWallet(address: string): string {
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getReceipt(id);
  if (!data) {
    return {
      title: 'RektReceipt',
      description: 'Find out how much Solana has taken from you.',
    };
  }
  const { grade } = getGrade(data.totalLeakageUsd);
  return {
    title: 'My RektReceipt',
    description: `I got grade ${grade} and leaked $${data.totalLeakageUsd.toFixed(2)} — check yours.`,
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getReceipt(id);

  if (!data) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-[#666] text-sm font-mono">Receipt not found or expired.</p>
          <Link href="/" className="text-[#14f195] text-sm font-mono hover:underline">
            Check yours →
          </Link>
        </div>
      </main>
    );
  }

  const { grade, color } = getGrade(data.totalLeakageUsd);

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
            <Row label="Wallet" value={maskWallet(data.wallet)} />
            <Row label="Swaps analyzed" value={String(data.transactionCount)} />
            <Row label="Total fees" value={`${data.totalFeesSol.toFixed(4)} SOL`} />
            <Row
              label="Jito tips"
              value={`${data.totalJitoTips} txns · ${data.totalJitoTipsSol.toFixed(4)} SOL`}
            />
            <div className="flex justify-between py-2 text-sm font-mono">
              <span className="text-[#666]">Execution grade</span>
              <span className={`font-bold ${color}`}>{grade}</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline mt-4 pt-4">
            <span className="text-[#666] text-xs tracking-widest font-mono">TOTAL REKT</span>
            <span className="text-red-400 font-bold text-lg">
              ${data.totalLeakageUsd.toFixed(2)}
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
