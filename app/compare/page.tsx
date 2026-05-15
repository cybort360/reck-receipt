'use client';

import { useState } from 'react';
import Link from 'next/link';

interface WalletResult {
  maskedWallet: string;
  grade: string;
  totalLeakageUsd: number;
  transactionCount: number;
  deadTokensCount: number;
  overtradingFeesUsd: number;
  personality: { title: string; description: string; emoji: string } | null;
}

interface CompareResult {
  wallet1: WalletResult;
  wallet2: WalletResult;
}

function gradeColor(grade: string): string {
  if (grade === 'A' || grade === 'B') return '#00ff88';
  if (grade === 'C') return '#facc15';
  return '#ff4444';
}

function StatRow({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[#6b7280] text-xs font-mono tracking-widest">{label}</span>
      <span className={`text-sm font-mono font-bold ${red ? 'text-[#ff4444]' : 'text-white'}`}>{value}</span>
    </div>
  );
}

function WalletCard({ result, winner }: { result: WalletResult; winner: boolean }) {
  return (
    <div
      className={`flex-1 min-w-0 border rounded-lg bg-[#111111] p-5 flex flex-col gap-4 transition-colors ${
        winner ? 'border-[#00ff88]/40' : 'border-[#1f2937]'
      }`}
    >
      {winner && (
        <span className="self-start bg-[#00ff88] text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded tracking-widest">
          WINNER
        </span>
      )}

      <div>
        <p className="text-[#6b7280] text-xs font-mono tracking-widest mb-1">WALLET</p>
        <p className="text-white text-sm font-mono font-bold">{result.maskedWallet}</p>
      </div>

      <div className="border-t border-[#1f2937]" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[#6b7280] text-xs font-mono tracking-widest">GRADE</span>
          <span className="text-2xl font-bold font-mono" style={{ color: gradeColor(result.grade) }}>
            {result.grade}
          </span>
        </div>

        <StatRow label="TOTAL REKT" value={`$${result.totalLeakageUsd.toFixed(2)}`} red />
        <StatRow label="SWAPS" value={result.transactionCount.toLocaleString()} />
        <StatRow
          label="DEAD BAGS"
          value={result.deadTokensCount === 0 ? 'None' : `${result.deadTokensCount} token${result.deadTokensCount === 1 ? '' : 's'}`}
        />
        <StatRow
          label="OVERTRADING FEES"
          value={result.overtradingFeesUsd > 0 ? `$${result.overtradingFeesUsd.toFixed(2)}` : '$0.00'}
          red={result.overtradingFeesUsd > 0}
        />

        {result.personality && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[#6b7280] text-xs font-mono tracking-widest">PERSONALITY</span>
            <span className="text-[#9ca3af] text-xs font-mono">{result.personality.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [wallet1, setWallet1] = useState('');
  const [wallet2, setWallet2] = useState('');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet1.trim() || !wallet2.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(
        `/api/compare?wallet1=${encodeURIComponent(wallet1.trim())}&wallet2=${encodeURIComponent(wallet2.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      setResult(data);
    } catch {
      setError('Failed to fetch comparison.');
    } finally {
      setLoading(false);
    }
  }

  const winner: 'wallet1' | 'wallet2' | 'tie' | null = result
    ? result.wallet1.totalLeakageUsd < result.wallet2.totalLeakageUsd
      ? 'wallet1'
      : result.wallet2.totalLeakageUsd < result.wallet1.totalLeakageUsd
        ? 'wallet2'
        : 'tie'
    : null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono text-[#00ff88]">Compare</h1>
            <p className="text-[#6b7280] text-sm mt-1 font-mono">Head-to-head wallet execution quality.</p>
          </div>
          <Link href="/" className="nav-link text-sm font-mono">
            ← Back
          </Link>
        </div>

        {/* Input form */}
        <form onSubmit={handleCompare} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={wallet1}
              onChange={(e) => setWallet1(e.target.value)}
              placeholder="wallet 1..."
              className="flex-1 min-w-0 bg-[#111111] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
            />
            <span className="text-[#6b7280] font-mono text-sm shrink-0">vs</span>
            <input
              type="text"
              value={wallet2}
              onChange={(e) => setWallet2(e.target.value)}
              placeholder="wallet 2..."
              className="flex-1 min-w-0 bg-[#111111] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !wallet1.trim() || !wallet2.trim()}
            className="w-full bg-[#00ff88] text-black font-bold py-2 rounded hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-sm"
          >
            {loading ? 'Loading…' : 'Compare'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="border border-red-900/40 rounded-lg bg-[#111111] p-4">
            <p className="text-[#ff4444] text-xs font-mono">{error}</p>
            {error.includes('not found') && (
              <p className="text-[#6b7280] text-xs font-mono mt-1">
                Run an audit on that wallet first so data is cached.
              </p>
            )}
          </div>
        )}

        {/* Result cards */}
        {result && (
          <div className="flex flex-col gap-4">
            {winner === 'tie' && (
              <p className="text-[#6b7280] text-xs font-mono text-center">Dead heat — identical leakage.</p>
            )}
            <div className="flex gap-3 items-start">
              <WalletCard result={result.wallet1} winner={winner === 'wallet1'} />
              <WalletCard result={result.wallet2} winner={winner === 'wallet2'} />
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
