'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface RefStats {
  code: string;
  url: string;
  clicks: number;
  conversions: number;
  earningsUsd: number;
  payoutStatus?: 'pending' | 'paid' | null;
}

function ReferralContent() {
  const params = useSearchParams();

  const [wallet, setWallet] = useState('');
  const [stats, setStats] = useState<RefStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [payoutRequesting, setPayoutRequesting] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutDone, setPayoutDone] = useState(false);

  useEffect(() => {
    const urlWallet = params.get('wallet');
    const stored = typeof window !== 'undefined'
      ? localStorage.getItem('rektreceipt-last-wallet') ?? ''
      : '';
    const resolved = urlWallet || stored;
    if (!resolved) {
      setLoading(false);
      return;
    }
    setWallet(resolved);
    fetch(`/api/referral/stats?wallet=${encodeURIComponent(resolved)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (!data) return;
        const payoutRes = await fetch(`/api/referral/payout-status?wallet=${encodeURIComponent(resolved)}`);
        const payoutData = payoutRes.ok ? await payoutRes.json() : {};
        setStats({ ...data, payoutStatus: payoutData.status ?? null });
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [params]);

  async function handleGenerate() {
    if (!wallet) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/referral/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });
      if (!res.ok) throw new Error('Failed to generate referral link');
      const data: RefStats = await res.json();
      setStats(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePayout() {
    if (!wallet) return;
    setPayoutRequesting(true);
    setPayoutError('');
    try {
      const res = await fetch('/api/referral/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayoutError(data.error ?? 'Request failed. Try again.');
        return;
      }
      setPayoutDone(true);
      setStats((prev) => prev ? { ...prev, payoutStatus: 'pending' } : prev);
    } catch {
      setPayoutError('Network error. Try again.');
    } finally {
      setPayoutRequesting(false);
    }
  }

  async function handleCopy() {
    if (!stats?.url) return;
    await navigator.clipboard.writeText(stats.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-4 bg-[#1f2937] rounded w-1/2" />
        <div className="h-4 bg-[#1f2937] rounded w-2/3" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <p className="text-[#6b7280] text-sm font-mono">
        No wallet found.{' '}
        <Link href="/" className="nav-link">Run an audit first</Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!stats ? (
        <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-4">
          <p className="text-xs font-mono text-[#00ff88] tracking-widest">REFERRAL</p>
          <p className="text-[#9ca3af] text-sm font-mono">
            Earn 50% of subscription revenue for every wallet you refer.
          </p>
          {error && <p className="text-[#ff4444] text-xs font-mono">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-[#00ff88] text-black font-bold py-2 rounded hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-mono"
          >
            {generating ? 'Generating...' : 'Generate my referral link'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Referral link card */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-3">
            <p className="text-xs font-mono text-[#00ff88] tracking-widest">YOUR REFERRAL LINK</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={stats.url}
                readOnly
                className="flex-1 bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-xs text-[#9ca3af] focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="border border-[#1f2937] text-[#9ca3af] hover:text-white hover:border-[#2d3748] px-3 py-2 rounded text-xs font-mono transition-colors whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Stats card */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-4">
            <p className="text-xs font-mono text-[#6b7280] tracking-widest">STATS</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[#6b7280] text-xs font-mono tracking-widest">CLICKS</span>
                <span className="text-white font-bold font-mono text-lg">{stats.clicks ?? 0}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#6b7280] text-xs font-mono tracking-widest">CONVERSIONS</span>
                <span className="text-white font-bold font-mono text-lg">{stats.conversions ?? 0}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#6b7280] text-xs font-mono tracking-widest">EARNINGS</span>
                <span className="text-[#00ff88] font-bold font-mono text-lg">${(stats.earningsUsd ?? 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t border-[#1f2937] pt-3 flex flex-col gap-2">
              {stats.payoutStatus === 'pending' || payoutDone ? (
                <p className="text-[#6b7280] text-xs font-mono">
                  Payout requested — we'll process it within 48 hours.
                </p>
              ) : (stats.earningsUsd ?? 0) >= 10 ? (
                <>
                  {payoutError && <p className="text-[#ff4444] text-xs font-mono">{payoutError}</p>}
                  <button
                    onClick={handlePayout}
                    disabled={payoutRequesting}
                    className="w-full border border-[#00ff88]/40 text-[#00ff88] text-xs font-mono py-2 rounded hover:bg-[#00ff88]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {payoutRequesting ? 'Requesting…' : 'Request payout'}
                  </button>
                </>
              ) : (
                <p className="text-[#6b7280] text-xs font-mono">
                  Minimum payout is $10. Keep referring to unlock withdrawals.
                </p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function ReferralPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-[#00ff88]">Referral</h1>
          <Link href="/" className="nav-link text-xs font-mono">
            ← Audit
          </Link>
        </div>
        <p className="text-[#6b7280] text-sm font-mono -mt-2">
          Refer wallets and earn 50% of their subscription.
        </p>
        <Suspense fallback={
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-4 bg-[#1f2937] rounded w-1/2" />
            <div className="h-4 bg-[#1f2937] rounded w-2/3" />
          </div>
        }>
          <ReferralContent />
        </Suspense>
      </div>
    </main>
  );
}
