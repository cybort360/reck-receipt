import Link from 'next/link';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
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
  if (usd < 1) return { grade: 'A', gradeColor: 'text-[#00ff88]' };
  if (usd < 5) return { grade: 'B', gradeColor: 'text-[#00ff88]' };
  if (usd < 20) return { grade: 'C', gradeColor: 'text-yellow-400' };
  if (usd < 50) return { grade: 'D', gradeColor: 'text-[#ff4444]' };
  return { grade: 'F', gradeColor: 'text-[#ff4444]' };
}

function maskWallet(address: string): string {
  return `${address.slice(0, 1)}••••••••••••`;
}

async function getRektboard(): Promise<RektboardEntry[]> {
  const wallets = await redis.zrange(KEYS.lbGlobal(), 0, 19, { rev: true });

  const shareIds = await Promise.all(
    wallets.map((wallet) => redis.get<string>(KEYS.shareByWallet(wallet as string))),
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
        maskedWallet: maskWallet(wallet as string),
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
            <h1 className="text-2xl font-bold tracking-tight font-mono text-[#00ff88]">Rektboard</h1>
            <p className="text-[#6b7280] text-sm mt-1 font-mono">Most rekt wallets in the last 7 days.</p>
          </div>
          <Link href="/" className="nav-link text-sm font-mono">
            ← Audit yours
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="text-[#6b7280] text-sm font-mono">No audits yet. Be the first.</p>
        ) : (
          <div className="border border-[#1f2937] rounded-lg overflow-hidden bg-[#111111]">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-[#1f2937] text-[#6b7280] text-xs tracking-widest">
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
                    className="border-b border-[#1f2937] hover:border-[#2d3748] hover:bg-[#161f2e] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#6b7280]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/share/${entry.shareId}`}
                        className="nav-link text-[#9ca3af]"
                      >
                        {entry.maskedWallet}
                      </Link>
                    </td>
                    <td className={`px-4 py-3 font-bold ${entry.gradeColor}`}>
                      {entry.grade}
                    </td>
                    <td className="px-4 py-3 text-right text-[#ff4444] font-bold">
                      ${entry.totalLeakageUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6b7280]">
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
