import { cache } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

interface RektScoreData {
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

const getScore = cache(async (wallet: string): Promise<RektScoreData | null> => {
  const raw = await redis.get(KEYS.rektScore(wallet));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as RektScoreData);
});

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function getGradeColor(grade: string): string {
  if (grade === 'S' || grade === 'A') return '#00ff88';
  if (grade === 'B') return '#ffd700';
  if (grade === 'C' || grade === 'D') return '#ff8800';
  return '#ff4444';
}

const SCORE_BARS: { label: string; key: keyof RektScoreData['breakdown'] }[] = [
  { label: 'Win Rate', key: 'winRate' },
  { label: 'Slippage Eff.', key: 'slippageEfficiency' },
  { label: 'Discipline', key: 'disciplineScore' },
  { label: 'Rug Resilience', key: 'rugResilience' },
  { label: 'Bag Health', key: 'bagHealth' },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ wallet: string }>;
}): Promise<Metadata> {
  const { wallet } = await params;
  const score = await getScore(wallet);
  const walletShort = truncateWallet(wallet);

  if (!score) {
    return {
      title: 'RektReceipt — Wallet Score',
      description: 'Check your wallet score on RektReceipt.',
    };
  }

  const ogTitle = `${walletShort} scored ${score.score}/100 on RektReceipt`;

  return {
    title: ogTitle,
    description: `Grade ${score.grade} · ${score.score}/100. Check your wallet score.`,
    openGraph: {
      title: ogTitle,
      description: `Grade ${score.grade} · ${score.score}/100`,
    },
    twitter: {
      card: 'summary',
      title: ogTitle,
      description: `Grade ${score.grade} · ${score.score}/100`,
    },
  };
}

export default async function ScorePage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  const score = await getScore(wallet);
  const walletShort = truncateWallet(wallet);

  if (!score) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-[#6b7280] text-sm font-mono">No audit found. Run an audit first.</p>
          <Link
            href="/"
            className="border border-[#1f2937] text-[#9ca3af] hover:text-white hover:border-[#2d3748] px-4 py-2 rounded text-xs font-mono transition-colors"
          >
            Audit your wallet →
          </Link>
        </div>
      </main>
    );
  }

  const gradeColor = getGradeColor(score.grade);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-16 flex flex-col items-center justify-center gap-6">
      <div className="w-full max-w-sm flex flex-col gap-4">

        <div>
          <Link href="/" className="text-xl font-bold tracking-tight font-mono hover:opacity-80 transition-opacity">
            RektReceipt
          </Link>
          <p className="text-[#6b7280] text-xs font-mono mt-1">{walletShort}</p>
        </div>

        <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5">
          <p className="text-[#00ff88] text-xs tracking-widest font-mono mb-5">REKT SCORE</p>

          <div className="flex items-baseline gap-4 justify-center mb-7">
            <span
              className="text-7xl font-bold font-mono leading-none"
              style={{ color: gradeColor }}
            >
              {score.score}
            </span>
            <div className="flex flex-col gap-0.5">
              <span
                className="text-4xl font-bold font-mono leading-none"
                style={{ color: gradeColor }}
              >
                {score.grade}
              </span>
              <span className="text-xs font-mono text-[#6b7280]">/ 100</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {SCORE_BARS.map(({ label, key }) => {
              const value = score.breakdown[key];
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-mono text-[#6b7280] tracking-wider">{label}</span>
                    <span className="text-[10px] font-mono text-[#9ca3af]">{value}</span>
                  </div>
                  <div className="h-0.5 bg-[#1f2937] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${value}%`, backgroundColor: gradeColor, opacity: 0.65 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {score.score >= 70 ? (
          <Link
            href="/signals/apply"
            className="w-full text-center bg-[#00ff88] text-black font-bold py-2.5 rounded text-sm font-mono hover:bg-[#00e67a] transition-colors"
          >
            Become a Signal Provider
          </Link>
        ) : (
          <Link
            href="/"
            className="w-full text-center border border-[#1f2937] text-[#9ca3af] hover:text-white hover:border-[#2d3748] py-2.5 rounded text-sm font-mono transition-colors"
          >
            Audit Your Wallet
          </Link>
        )}

      </div>
    </main>
  );
}
