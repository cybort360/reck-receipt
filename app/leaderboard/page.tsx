import Link from 'next/link';
import type { Metadata } from 'next';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import type { LeaderboardEntry } from '@/components/LeaderboardTable';

export const metadata: Metadata = {
  title: 'Top Traders by RektScore — RektReceipt',
  description: 'The highest-scoring Solana wallets ranked by execution quality.',
};

interface StoredScore {
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

export default async function LeaderboardPage() {
  const raw = await redis.zrange(KEYS.scoreIndex(), 0, 49, { rev: true, withScores: true });

  const wallets: string[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    wallets.push(raw[i] as string);
  }

  if (wallets.length === 0) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold font-mono">Top Traders by RektScore</h1>
            <Link href="/" className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
              ← Home
            </Link>
          </div>
          <p className="text-[#6b7280] text-sm font-mono">
            No scores yet.{' '}
            <Link href="/" className="text-[#00ff88] hover:underline">
              Audit a wallet
            </Link>{' '}
            to get started.
          </p>
        </div>
      </main>
    );
  }

  const scoreRaws = await redis.mget<(StoredScore | null)[]>(
    ...wallets.map((w) => KEYS.rektScore(w)),
  );

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < wallets.length; i++) {
    const raw = scoreRaws[i];
    if (!raw) continue;
    const s: StoredScore = typeof raw === 'string' ? JSON.parse(raw) : raw;
    entries.push({
      rank: entries.length + 1,
      wallet: wallets[i],
      score: s.score,
      grade: s.grade,
      breakdown: s.breakdown,
    });
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono">Top Traders by RektScore</h1>
            <p className="text-[#6b7280] text-xs font-mono mt-1">
              {entries.length} wallet{entries.length !== 1 ? 's' : ''} ranked
            </p>
          </div>
          <Link
            href="/"
            className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors"
          >
            ← Home
          </Link>
        </div>

        <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5">
          <div className="hidden sm:flex text-[10px] font-mono text-[#374151] tracking-widest mb-3 px-0 gap-8">
            <span>WIN = Win Rate</span>
            <span>SLIP = Slippage Efficiency</span>
            <span>DISC = Discipline</span>
            <span>RUG = Rug Resilience</span>
            <span>BAG = Bag Health</span>
          </div>
          <LeaderboardTable entries={entries} />
        </div>

      </div>
    </main>
  );
}
