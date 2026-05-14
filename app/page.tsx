'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { LeakageSummary } from '@/lib/fees';

interface TokenBreakdownEntry {
  symbol: string;
  mint: string;
  totalFeesUsd: number;
  swapCount: number;
}

interface AuditResult extends LeakageSummary {
  wallet: string;
  shareId: string;
  tokenBreakdown: TokenBreakdownEntry[];
  peerAvgLeakageUsd: number | null;
  peerPercentile: number | null;
}

interface WeeklyStats {
  topLeakageUsd: number;
  topGrade?: string;
  topMaskedWallet?: string;
  shareId?: string;
}

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm font-mono">
      <span className="text-[#666]">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function getGrade(usd: number): { grade: string; color: string } {
  if (usd < 1) return { grade: 'A', color: 'text-green-400' };
  if (usd < 5) return { grade: 'B', color: 'text-green-400' };
  if (usd < 20) return { grade: 'C', color: 'text-yellow-400' };
  if (usd < 50) return { grade: 'D', color: 'text-red-400' };
  return { grade: 'F', color: 'text-red-400' };
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<WeeklyStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data: WeeklyStats) => setStats({ ...data, topLeakageUsd: parseFloat(String(data.topLeakageUsd)) }))
      .catch(() => null);
  }, []);

  async function handleShare() {
    if (!result) return;
    const grade = getGrade(result.totalLeakageUsd).grade;
    const tweet = `I got a ${grade} on RektReceipt. I've leaked $${result.totalLeakageUsd.toFixed(2)} across ${result.transactionCount} swaps. Check yours: https://rektreceipt.vercel.app/share/${result.shareId} #RektReceipt`;
    await navigator.clipboard.writeText(tweet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/audit?wallet=${encodeURIComponent(address)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Audit failed');
      }
      const data: AuditResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch. Check the wallet address.');
    } finally {
      setLoading(false);
    }
  }

  const showRight = loading || result !== null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-8">

        {/* Left column — input */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-bold tracking-tight font-mono">RektReceipt</h1>
            <Link href="/rektboard" className="text-[#444] text-xs font-mono hover:text-[#888] transition-colors">
              Rektboard →
            </Link>
          </div>
          <p className="text-[#666] text-sm">Find out how much Solana has taken from you.</p>
          {stats && stats.topLeakageUsd > 0 && stats.shareId && (
            <Link
              href={`/share/${stats.shareId}`}
              className="flex items-center gap-2 bg-[#111] border border-[#1a1a1a] rounded px-3 py-2 text-xs font-mono hover:border-[#2a2a2a] transition-colors"
            >
              <span className="text-[#555]">This week&apos;s most rekt wallet lost</span>
              <span className="text-red-400 font-bold">${stats.topLeakageUsd.toFixed(2)}</span>
              {stats.topGrade && (
                <span className={`font-bold ml-auto ${getGrade(stats.topLeakageUsd).color}`}>
                  {stats.topGrade}
                </span>
              )}
            </Link>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="wallet address..."
              aria-label="Wallet address"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444]"
            />
            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="w-full bg-[#14f195] text-black font-bold py-2 rounded hover:bg-[#10d980] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Auditing…' : 'Audit'}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Right column — receipt */}
        {showRight && (
          <div className="flex-1">
            {loading ? (
              <div className="border border-dashed border-[#2a2a2a] rounded-lg bg-[#111] p-5 flex flex-col gap-3 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 bg-[#1a1a1a] rounded" />
                ))}
              </div>
            ) : result ? (
              <div className="flex flex-col gap-3">
                <div className="border border-dashed border-[#2a2a2a] rounded-lg bg-[#111] p-5">
                  <p className="text-[#14f195] text-xs tracking-widest font-mono mb-4">RECEIPT</p>
                  <div className="flex flex-col divide-y divide-[#1a1a1a]">
                    <Row label="Wallet" value={truncateWallet(result.wallet)} />
                    <Row label="Swaps analyzed" value={String(result.transactionCount)} />
                    <Row label="Total fees" value={`${result.totalFeesSol.toFixed(4)} SOL`} />
                    <Row label="Jito tips" value={`${result.totalJitoTips} txns · ${result.totalJitoTipsSol.toFixed(4)} SOL`} />
                    <div className="flex justify-between py-2 text-sm font-mono">
                      <span className="text-[#666]">Sandwich detection</span>
                      <span className="text-[#444] italic">coming soon</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm font-mono">
                      <span className="text-[#666]">Execution grade</span>
                      <span className={`font-bold ${getGrade(result.totalLeakageUsd).color}`}>
                        {getGrade(result.totalLeakageUsd).grade}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline mt-4 pt-4">
                    <span className="text-[#666] text-xs tracking-widest font-mono">TOTAL REKT</span>
                    <span className="text-red-400 font-bold text-lg">
                      ${result.totalLeakageUsd.toFixed(2)}
                    </span>
                  </div>
                </div>
                {result.peerPercentile !== null && (
                  <p className={`text-xs font-mono px-1 ${result.peerPercentile > 50 ? 'text-red-400' : 'text-green-400'}`}>
                    You leaked more than {result.peerPercentile}% of wallets with similar trade volume.
                  </p>
                )}
                {result.tokenBreakdown.length > 0 && (
                  <div className="border border-[#1a1a1a] rounded-lg bg-[#111] p-5">
                    <p className="text-[#14f195] text-xs tracking-widest font-mono mb-4">FEE BREAKDOWN BY TOKEN</p>
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-[#444] tracking-widest">
                          <th className="text-left pb-2 font-normal">TOKEN</th>
                          <th className="text-right pb-2 font-normal">SWAPS</th>
                          <th className="text-right pb-2 font-normal">FEES PAID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1a1a1a]">
                        {result.tokenBreakdown.map((entry) => (
                          <tr key={entry.mint}>
                            <td className="py-2 text-white">{entry.symbol}</td>
                            <td className="py-2 text-right text-[#666]">{entry.swapCount}</td>
                            <td className="py-2 text-right text-red-400">${entry.totalFeesUsd.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button
                  onClick={handleShare}
                  className="w-full border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] py-2 rounded text-sm font-mono transition-colors"
                >
                  {copied ? 'Copied to clipboard!' : 'Share →'}
                </button>
                <Link
                  href={`/history/${result.wallet}`}
                  className="w-full text-center text-[#555] hover:text-[#888] text-xs font-mono transition-colors"
                >
                  View history →
                </Link>
              </div>
            ) : null}
          </div>
        )}

      </div>
    </main>
  );
}
