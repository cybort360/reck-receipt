import Link from 'next/link';
import { redis } from '@/lib/redis';

interface HistoryEntry {
  timestamp: number;
  totalLeakageUsd: number;
  totalFeesSol: number;
  totalJitoTipsSol: number;
  transactionCount: number;
  grade: string;
  shareId: string;
}

function gradeColor(grade: string): string {
  if (grade === 'A' || grade === 'B') return 'text-green-400';
  if (grade === 'C') return 'text-yellow-400';
  return 'text-red-400';
}

export default async function HistoryPage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;

  const raw = await redis.lrange(`history:${wallet}`, 0, -1);
  const entries: HistoryEntry[] = (raw as unknown[])
    .map((item) => item as HistoryEntry)
    .sort((a, b) => a.timestamp - b.timestamp);

  const trend =
    entries.length >= 2
      ? (() => {
          const first = entries[0].totalLeakageUsd;
          const last = entries[entries.length - 1].totalLeakageUsd;
          const pct = ((last - first) / first) * 100;
          return { worse: last > first, pct: Math.abs(pct) };
        })()
      : null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono">Audit History</h1>
            <p className="text-[#555] text-xs font-mono mt-1 break-all">{wallet.slice(0, 1)}••••••••••••</p>
          </div>
          <Link href="/" className="text-[#14f195] text-sm font-mono hover:underline">
            ← Audit
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="text-[#444] text-sm font-mono">No history found for this wallet.</p>
        ) : (
          <>
            {trend && (
              <p className={`text-sm font-mono font-bold ${trend.worse ? 'text-red-400' : 'text-green-400'}`}>
                {trend.worse ? 'Getting worse' : 'Getting better'} ({trend.pct.toFixed(1)}%)
              </p>
            )}

            <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b border-[#1a1a1a] text-[#444] text-xs tracking-widest">
                    <th className="text-left px-4 py-3 font-normal">DATE</th>
                    <th className="text-right px-4 py-3 font-normal">SWAPS</th>
                    <th className="text-right px-4 py-3 font-normal">FEES SOL</th>
                    <th className="text-right px-4 py-3 font-normal">JITO SOL</th>
                    <th className="text-right px-4 py-3 font-normal">TOTAL REKT</th>
                    <th className="text-right px-4 py-3 font-normal">GRADE</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.timestamp}
                      className="border-b border-[#111] hover:bg-[#111] transition-colors"
                    >
                      <td className="px-4 py-3 text-[#666]">
                        {new Date(entry.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right text-[#666]">{entry.transactionCount}</td>
                      <td className="px-4 py-3 text-right text-[#888]">{entry.totalFeesSol.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-[#888]">{entry.totalJitoTipsSol.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-red-400 font-bold">
                        <Link href={`/share/${entry.shareId}`} className="hover:underline">
                          ${entry.totalLeakageUsd.toFixed(2)}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${gradeColor(entry.grade)}`}>
                        {entry.grade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </main>
  );
}
