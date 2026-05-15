'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score: number;
  grade: string;
  breakdown: {
    winRate: number;
    slippageEfficiency: number;
    disciplineScore: number;
    rugResilience: number;
    bagHealth: number;
  };
}

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function gradeColorClass(grade: string): string {
  if (grade === 'S' || grade === 'A') return 'text-[#00ff88]';
  if (grade === 'B') return 'text-[#ffd700]';
  if (grade === 'C' || grade === 'D') return 'text-[#ff8800]';
  return 'text-[#ff4444]';
}

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  const [query, setQuery] = useState('');

  const visible = query
    ? entries.filter((e) => e.wallet.toLowerCase().startsWith(query.toLowerCase()))
    : entries;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="filter by wallet prefix..."
        aria-label="Filter by wallet address"
        className="w-full sm:w-72 bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="text-[#6b7280] tracking-widest border-b border-[#1f2937]">
              <th className="text-left pb-3 pr-4 font-normal">#</th>
              <th className="text-left pb-3 pr-4 font-normal">WALLET</th>
              <th className="text-right pb-3 pr-4 font-normal">SCORE</th>
              <th className="text-right pb-3 pr-4 font-normal">GRADE</th>
              <th className="text-right pb-3 pr-3 font-normal hidden sm:table-cell">WIN</th>
              <th className="text-right pb-3 pr-3 font-normal hidden sm:table-cell">SLIP</th>
              <th className="text-right pb-3 pr-3 font-normal hidden sm:table-cell">DISC</th>
              <th className="text-right pb-3 pr-3 font-normal hidden sm:table-cell">RUG</th>
              <th className="text-right pb-3 font-normal hidden sm:table-cell">BAG</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => (
              <tr
                key={entry.wallet}
                className="border-b border-[#1f2937] hover:bg-[#161f2e] transition-colors"
              >
                <td className="py-2.5 pr-4 text-[#374151]">{entry.rank}</td>
                <td className="py-2.5 pr-4">
                  <Link
                    href={`/score/${entry.wallet}`}
                    className="text-[#9ca3af] hover:text-[#00ff88] transition-colors"
                  >
                    {truncateWallet(entry.wallet)}
                  </Link>
                </td>
                <td className={`py-2.5 pr-4 text-right font-bold ${gradeColorClass(entry.grade)}`}>
                  {entry.score}
                </td>
                <td className={`py-2.5 pr-4 text-right font-bold ${gradeColorClass(entry.grade)}`}>
                  {entry.grade}
                </td>
                <td className="py-2.5 pr-3 text-right text-[#6b7280] hidden sm:table-cell">
                  {entry.breakdown.winRate}
                </td>
                <td className="py-2.5 pr-3 text-right text-[#6b7280] hidden sm:table-cell">
                  {entry.breakdown.slippageEfficiency}
                </td>
                <td className="py-2.5 pr-3 text-right text-[#6b7280] hidden sm:table-cell">
                  {entry.breakdown.disciplineScore}
                </td>
                <td className="py-2.5 pr-3 text-right text-[#6b7280] hidden sm:table-cell">
                  {entry.breakdown.rugResilience}
                </td>
                <td className="py-2.5 text-right text-[#6b7280] hidden sm:table-cell">
                  {entry.breakdown.bagHealth}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="text-[#6b7280] text-xs font-mono text-center py-8">
            {query ? 'No wallets match that prefix.' : 'No scores yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
