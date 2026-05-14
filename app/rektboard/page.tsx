import Link from 'next/link';
import { redis } from '@/lib/redis';
import type { LeakageSummary } from '@/lib/fees';

interface ReceiptData extends LeakageSummary {
  wallet: string;
}

interface RektboardEntry {
  shareId: string;
  maskedWallet: string;
  grade: string;
  gradeColor: string;
  totalLeakageUsd: number;
  transactionCount: number;
}

function getGrade(usd: number): { grade: string; gradeColor: string } {
  if (usd < 1) return { grade: 'A', gradeColor: 'text-green-400' };
  if (usd < 5) return { grade: 'B', gradeColor: 'text-green-400' };
  if (usd < 20) return { grade: 'C', gradeColor: 'text-yellow-400' };
  if (usd < 50) return { grade: 'D', gradeColor: 'text-red-400' };
  return { grade: 'F', gradeColor: 'text-red-400' };
}

function maskWallet(address: string): string {
  return `${address.slice(0, 1)}••••••••••••`;
}

async function getRektboard(): Promise<RektboardEntry[]> {
  const wallets = await redis.zrange('rektboard', 0, 19, { rev: true });

  const shareIds = await Promise.all(
    wallets.map((wallet) => redis.get<string>(`wallet:shareId:${wallet}`)),
  );

  const receipts = await Promise.all(
    shareIds.map((shareId) => shareId ? redis.get<ReceiptData>(`receipt:${shareId}`) : null),
  );

  return wallets
    .map((wallet, i) => {
      const shareId = shareIds[i];
      const data = receipts[i];
      if (!shareId || !data) return null;
      const { grade, gradeColor } = getGrade(data.totalLeakageUsd);
      return {
        shareId,
        maskedWallet: maskWallet(wallet),
        grade,
        gradeColor,
        totalLeakageUsd: data.totalLeakageUsd,
        transactionCount: data.transactionCount,
      };
    })
    .filter((e): e is RektboardEntry => e !== null);
}

export const metadata = {
  title: 'Rektboard — RektReceipt',
  description: 'The most rekt Solana wallets.',
};

export default async function RektboardPage() {
  const entries = await getRektboard();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono">Rektboard</h1>
            <p className="text-[#666] text-sm mt-1">Most rekt wallets in the last 7 days.</p>
          </div>
          <Link href="/" className="text-[#14f195] text-sm font-mono hover:underline">
            ← Audit yours
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="text-[#444] text-sm font-mono">No audits yet. Be the first.</p>
        ) : (
          <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#444] text-xs tracking-widest">
                  <th className="text-left px-4 py-3 font-normal">RANK</th>
                  <th className="text-left px-4 py-3 font-normal">WALLET</th>
                  <th className="text-left px-4 py-3 font-normal">GRADE</th>
                  <th className="text-right px-4 py-3 font-normal">TOTAL REKT</th>
                  <th className="text-right px-4 py-3 font-normal">SWAPS</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.shareId}
                    className="border-b border-[#111] hover:bg-[#111] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#444]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/share/${entry.shareId}`}
                        className="text-[#888] hover:text-white transition-colors"
                      >
                        {entry.maskedWallet}
                      </Link>
                    </td>
                    <td className={`px-4 py-3 font-bold ${entry.gradeColor}`}>
                      {entry.grade}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 font-bold">
                      ${entry.totalLeakageUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#666]">
                      {entry.transactionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  );
}
