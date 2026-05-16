'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

interface ScoreData {
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

interface AuditData {
  efficiencyScore: number;
  transactionCount: number;
  totalLeakageUsd: number;
}

interface WalletData {
  wallet: string;
  score: ScoreData;
  audit: AuditData;
}

type BetterFn = (a: number, b: number) => -1 | 0 | 1;

const higher: BetterFn = (a, b) => (a > b ? -1 : a < b ? 1 : 0); // -1 = a wins, 1 = b wins
const lower: BetterFn  = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const GRADE_ORDER: Record<string, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };

interface Row {
  label: string;
  a: string;
  b: string;
  winner: -1 | 0 | 1; // -1 = a wins, 1 = b wins, 0 = tie
}

function buildRows(a: WalletData, b: WalletData): Row[] {
  function row(
    label: string,
    valA: number,
    valB: number,
    fmt: (v: number) => string,
    better: BetterFn,
  ): Row {
    return { label, a: fmt(valA), b: fmt(valB), winner: better(valA, valB) };
  }

  const gradeWinner: -1 | 0 | 1 = (() => {
    const ga = GRADE_ORDER[a.score.grade] ?? 0;
    const gb = GRADE_ORDER[b.score.grade] ?? 0;
    return ga > gb ? -1 : ga < gb ? 1 : 0;
  })();

  return [
    row('RektScore',          a.score.score,                      b.score.score,                      (v) => String(v),         higher),
    { label: 'Grade', a: a.score.grade, b: b.score.grade, winner: gradeWinner },
    row('Efficiency Score',   a.audit.efficiencyScore,            b.audit.efficiencyScore,            (v) => String(v),         higher),
    row('Win Rate',           a.score.breakdown.winRate,          b.score.breakdown.winRate,          (v) => `${v}%`,           higher),
    row('Slippage Efficiency',a.score.breakdown.slippageEfficiency,b.score.breakdown.slippageEfficiency,(v) => `${v}%`,         higher),
    row('Discipline',         a.score.breakdown.disciplineScore,  b.score.breakdown.disciplineScore,  (v) => `${v}%`,           higher),
    row('Rug Resilience',     a.score.breakdown.rugResilience,    b.score.breakdown.rugResilience,    (v) => `${v}%`,           higher),
    row('Bag Health',         a.score.breakdown.bagHealth,        b.score.breakdown.bagHealth,        (v) => `${v}%`,           higher),
    row('Total Fees Lost',    a.audit.totalLeakageUsd,            b.audit.totalLeakageUsd,            (v) => `$${v.toFixed(2)}`,lower),
    row('Swaps Analyzed',     a.audit.transactionCount,           b.audit.transactionCount,           (v) => v.toLocaleString(),(_, __) => 0),
  ];
}

function short(wallet: string) {
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

function CompareContent() {
  const params = useSearchParams();
  const [wallet1, setWallet1] = useState(params.get('wallet1') ?? '');
  const [wallet2, setWallet2] = useState(params.get('wallet2') ?? '');
  const [result, setResult] = useState<{ a: WalletData; b: WalletData } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    const w1 = wallet1.trim();
    const w2 = wallet2.trim();
    if (!w1 || !w2) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const [s1, s2, a1, a2] = await Promise.all([
        fetch(`/api/score/${encodeURIComponent(w1)}`),
        fetch(`/api/score/${encodeURIComponent(w2)}`),
        fetch(`/api/audit?wallet=${encodeURIComponent(w1)}`),
        fetch(`/api/audit?wallet=${encodeURIComponent(w2)}`),
      ]);

      if (s1.status === 404) { setError(`No audit found for wallet 1 — run an audit first.`); return; }
      if (s2.status === 404) { setError(`No audit found for wallet 2 — run an audit first.`); return; }
      if (!s1.ok || !s2.ok || !a1.ok || !a2.ok) { setError('Failed to fetch one or both wallets.'); return; }

      const [score1, score2, audit1, audit2] = await Promise.all([
        s1.json() as Promise<ScoreData>,
        s2.json() as Promise<ScoreData>,
        a1.json() as Promise<AuditData>,
        a2.json() as Promise<AuditData>,
      ]);

      setResult({
        a: { wallet: w1, score: score1, audit: audit1 },
        b: { wallet: w2, score: score2, audit: audit2 },
      });
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const rows = result ? buildRows(result.a, result.b) : [];
  const aWins = rows.filter((r) => r.winner === -1).length;
  const bWins = rows.filter((r) => r.winner ===  1).length;
  const effA = result?.a.audit.efficiencyScore ?? 0;
  const effB = result?.b.audit.efficiencyScore ?? 0;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">

      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono text-[#00ff88]">Compare</h1>
          <p className="text-[#6b7280] text-sm mt-1 font-mono">Head-to-head wallet execution quality.</p>
        </div>
        <Link href="/" className="nav-link text-sm font-mono text-[#6b7280]">← Back</Link>
      </div>

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

      {error && (
        <div className="border border-red-900/40 rounded-lg bg-[#111111] p-4">
          <p className="text-[#ff4444] text-xs font-mono">{error}</p>
          {error.includes('audit') && (
            <p className="text-[#6b7280] text-xs font-mono mt-1">
              Paste the wallet address on the homepage to run an audit first.
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          {/* Comparison table */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-[#1f2937]">
              <div className="px-4 py-3 text-[#374151] text-[11px] font-mono tracking-widest">METRIC</div>
              <div className="px-4 py-3 text-center text-[#9ca3af] text-[11px] font-mono tracking-widest truncate">
                {short(result.a.wallet)}
              </div>
              <div className="px-4 py-3 text-center text-[#9ca3af] text-[11px] font-mono tracking-widest truncate">
                {short(result.b.wallet)}
              </div>
            </div>

            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 ${i < rows.length - 1 ? 'border-b border-[#1f2937]' : ''}`}
              >
                <div className="px-4 py-3 text-[#6b7280] text-xs font-mono">{row.label}</div>
                <div className={`px-4 py-3 text-center text-sm font-bold font-mono ${row.winner === -1 ? 'text-[#00ff88]' : 'text-[#6b7280]'}`}>
                  {row.a}
                </div>
                <div className={`px-4 py-3 text-center text-sm font-bold font-mono ${row.winner === 1 ? 'text-[#00ff88]' : 'text-[#6b7280]'}`}>
                  {row.b}
                </div>
              </div>
            ))}
          </div>

          {/* Verdict */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] px-5 py-4 flex flex-col gap-1">
            <p className="text-[#374151] text-[11px] font-mono tracking-widest">VERDICT</p>
            <p className="text-white text-sm font-mono font-bold">
              {effA === effB
                ? 'Dead heat — identical execution efficiency.'
                : effA > effB
                  ? `${short(result.a.wallet)} has better execution efficiency`
                  : `${short(result.b.wallet)} has better execution efficiency`}
            </p>
            <p className="text-[#6b7280] text-xs font-mono mt-1">
              {short(result.a.wallet)}: {aWins} wins · {short(result.b.wallet)}: {bWins} wins
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-12">
      <Suspense fallback={
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-32 bg-[#111111] rounded animate-pulse mb-4" />
          <div className="h-12 bg-[#111111] rounded animate-pulse" />
        </div>
      }>
        <CompareContent />
      </Suspense>
    </main>
  );
}
