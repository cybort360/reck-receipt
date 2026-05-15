'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BestEntry {
  wallet: string;
  maskedWallet: string;
  grade: string;
  totalLeakageUsd: number;
  transactionCount: number;
  personality: { title: string; description: string; emoji: string } | null;
}

function gradeColor(grade: string): string {
  if (grade === 'A' || grade === 'B') return 'text-[#00ff88]';
  if (grade === 'C') return 'text-yellow-400';
  return 'text-[#ff4444]';
}

export default function BestboardPage() {
  const [entries, setEntries] = useState<BestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/bestboard')
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setError('Failed to load leaderboard.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono text-[#00ff88]">Best Traders</h1>
            <p className="text-[#6b7280] text-sm mt-1 font-mono">Lowest execution leakage on Solana.</p>
          </div>
          <Link href="/" className="nav-link text-sm font-mono">
            ← Audit yours
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-8 flex items-center justify-center">
            <p className="text-[#6b7280] text-xs font-mono animate-pulse">Loading...</p>
          </div>
        )}

        {/* Error */}
        {error && <p className="text-[#ff4444] text-sm font-mono">{error}</p>}

        {/* Empty */}
        {!loading && !error && entries.length === 0 && (
          <p className="text-[#6b7280] text-sm font-mono">No audits yet. Be the first.</p>
        )}

        {/* Table */}
        {!loading && entries.length > 0 && (
          <div className="border border-[#1f2937] rounded-lg overflow-hidden bg-[#111111]">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-[#1f2937] text-[#6b7280] text-xs tracking-widest">
                  <th className="text-left px-4 py-3 font-normal">RANK</th>
                  <th className="text-left px-4 py-3 font-normal">WALLET</th>
                  <th className="text-left px-4 py-3 font-normal">GRADE</th>
                  <th className="text-right px-4 py-3 font-normal">LEAKAGE</th>
                  <th className="text-right px-4 py-3 font-normal">SWAPS</th>
                  <th className="text-left px-4 py-3 font-normal hidden sm:table-cell">PERSONALITY</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.wallet}
                    className="border-b border-[#1f2937] hover:border-[#2d3748] hover:bg-[#161f2e] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#6b7280]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/?wallet=${encodeURIComponent(entry.wallet)}`}
                        className="nav-link text-[#9ca3af]"
                      >
                        {entry.maskedWallet}
                      </Link>
                    </td>
                    <td className={`px-4 py-3 font-bold ${gradeColor(entry.grade)}`}>
                      {entry.grade}
                    </td>
                    <td className="px-4 py-3 text-right text-[#00ff88] font-bold">
                      ${entry.totalLeakageUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6b7280]">
                      {entry.transactionCount}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] hidden sm:table-cell">
                      {entry.personality?.title ?? '—'}
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
