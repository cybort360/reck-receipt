'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'rektreceipt-wallets';
const MAX_WALLETS = 10;

interface WalletResult {
  wallet: string;
  totalLeakageUsd: number;
  totalFeesSol: number;
  transactionCount: number;
  personality?: { title: string; emoji: string };
  loading: boolean;
  error: boolean;
}

function getGrade(usd: number): { grade: string; color: string } {
  if (usd < 1) return { grade: 'A', color: 'text-[#00ff88]' };
  if (usd < 5) return { grade: 'B', color: 'text-[#00ff88]' };
  if (usd < 20) return { grade: 'C', color: 'text-yellow-400' };
  if (usd < 50) return { grade: 'D', color: 'text-[#ff4444]' };
  return { grade: 'F', color: 'text-[#ff4444]' };
}

function getGradeBorderColor(usd: number): string {
  if (usd < 20) return 'border-[#00ff88]/20';
  if (usd < 50) return 'border-yellow-900/40';
  return 'border-[#ff4444]/20';
}

function gradeToNum(grade: string): number {
  return { A: 5, B: 4, C: 3, D: 2, F: 1 }[grade] ?? 0;
}

function averageGrade(results: WalletResult[]): string {
  const done = results.filter((r) => !r.loading && !r.error);
  if (!done.length) return '—';
  const avg = done.reduce((sum, r) => sum + gradeToNum(getGrade(r.totalLeakageUsd).grade), 0) / done.length;
  if (avg >= 4.5) return 'A';
  if (avg >= 3.5) return 'B';
  if (avg >= 2.5) return 'C';
  if (avg >= 1.5) return 'D';
  return 'F';
}

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function Dashboard() {
  const [wallets, setWallets] = useState<string[]>([]);
  const [results, setResults] = useState<Map<string, WalletResult>>(new Map());
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [isPro, setIsPro] = useState(false);

  const fetchWallet = useCallback(async (address: string) => {
    setResults((prev) => {
      const next = new Map(prev);
      next.set(address, { wallet: address, totalLeakageUsd: 0, totalFeesSol: 0, transactionCount: 0, loading: true, error: false });
      return next;
    });
    try {
      const res = await fetch(`/api/audit?wallet=${encodeURIComponent(address)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults((prev) => {
        const next = new Map(prev);
        next.set(address, {
          wallet: address,
          totalLeakageUsd: data.totalLeakageUsd ?? 0,
          totalFeesSol: data.totalFeesSol ?? 0,
          transactionCount: data.transactionCount ?? 0,
          personality: data.personality,
          loading: false,
          error: false,
        });
        return next;
      });
    } catch {
      setResults((prev) => {
        const next = new Map(prev);
        next.set(address, { wallet: address, totalLeakageUsd: 0, totalFeesSol: 0, transactionCount: 0, loading: false, error: true });
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let stored: string[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
      setWallets(stored);
      stored.forEach(fetchWallet);
    } catch {
      setWallets([]);
    }
    if (stored[0]) {
      fetch(`/api/pro/status?wallet=${encodeURIComponent(stored[0])}`)
        .then((r) => r.json())
        .then((data) => setIsPro(data.isPro === true))
        .catch(() => null);
    }
  }, [fetchWallet]);

  function saveWallets(updated: string[]) {
    setWallets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (wallets.includes(trimmed)) {
      setInputError('Already added.');
      return;
    }
    if (!isPro && wallets.length >= 2) {
      setInputError('upgrade-prompt');
      return;
    }
    if (wallets.length >= MAX_WALLETS) {
      setInputError(`Max ${MAX_WALLETS} wallets.`);
      return;
    }
    const updated = [...wallets, trimmed];
    saveWallets(updated);
    setInput('');
    setInputError('');
    fetchWallet(trimmed);
  }

  function handleRemove(address: string) {
    saveWallets(wallets.filter((w) => w !== address));
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(address);
      return next;
    });
  }

  const loaded = wallets
    .map((w) => results.get(w))
    .filter((r): r is WalletResult => !!r && !r.loading && !r.error)
    .sort((a, b) => b.totalLeakageUsd - a.totalLeakageUsd);

  const totalLeakage = loaded.reduce((sum, r) => sum + r.totalLeakageUsd, 0);
  const totalSwaps = loaded.reduce((sum, r) => sum + r.transactionCount, 0);
  const avgGrade = averageGrade([...results.values()]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-[#00ff88]">Dashboard</h1>
            {isPro && (
              <span className="bg-[#00ff88] text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded">PRO</span>
            )}
          </div>
          <Link href="/" className="nav-link text-xs font-mono">
            ← Audit
          </Link>
        </div>

        {/* Add wallet */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setInputError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="wallet address..."
              className="flex-1 bg-[#111111] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim() || wallets.length >= MAX_WALLETS}
              className="bg-[#00ff88] text-black font-bold px-4 py-2 rounded hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-mono"
            >
              Add
            </button>
          </div>
          {inputError === 'upgrade-prompt' ? (
            <div className="border border-yellow-900/40 rounded-lg bg-[#111111] px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-yellow-400 text-xs font-mono">
                Upgrade to Pro to track unlimited wallets.
              </p>
              <Link
                href="/upgrade"
                className="shrink-0 border border-yellow-900/60 hover:border-yellow-700 text-yellow-400 hover:text-yellow-300 px-3 py-1 rounded text-xs font-mono transition-colors"
              >
                Upgrade
              </Link>
            </div>
          ) : inputError ? (
            <p className="text-[#ff4444] text-xs font-mono">{inputError}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <p className="text-[#6b7280] text-xs font-mono">{wallets.length}/{isPro ? MAX_WALLETS : 2} wallets</p>
            {!isPro && (
              <span className="text-[#374151] text-[10px] font-mono">· Free plan: 2 wallets max</span>
            )}
          </div>
        </div>

        {/* Aggregate summary */}
        {loaded.length > 0 && (
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[#6b7280] text-xs font-mono tracking-widest">TOTAL REKT</span>
              <span className="text-[#ff4444] font-bold font-mono text-sm">${totalLeakage.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#6b7280] text-xs font-mono tracking-widest">AVG GRADE</span>
              <span className={`font-bold font-mono text-sm ${getGrade(totalLeakage / loaded.length).color}`}>{avgGrade}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#6b7280] text-xs font-mono tracking-widest">TOTAL SWAPS</span>
              <span className="text-[#9ca3af] font-mono text-sm">{totalSwaps}</span>
            </div>
          </div>
        )}

        {/* Wallet cards */}
        <div className="flex flex-col gap-3">
          {wallets.length === 0 && (
            <p className="text-[#6b7280] text-sm font-mono text-center py-8">No wallets added yet.</p>
          )}
          {wallets.map((address) => {
            const r = results.get(address);
            const isLoading = !r || r.loading;
            const isError = r?.error;

            return (
              <div
                key={address}
                className={`border rounded-lg bg-[#111111] p-4 flex flex-col gap-3 hover:border-[#2d3748] transition-colors ${
                  isLoading || isError ? 'border-[#1f2937]' : getGradeBorderColor(r.totalLeakageUsd)
                }`}
              >
                {isLoading ? (
                  <div className="flex flex-col gap-2 animate-pulse">
                    <div className="h-3 bg-[#1f2937] rounded w-1/3" />
                    <div className="h-3 bg-[#1f2937] rounded w-1/2" />
                  </div>
                ) : isError ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[#6b7280] text-xs font-mono">{truncateWallet(address)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#ff4444] text-xs font-mono">failed to load</span>
                      <button
                        onClick={() => handleRemove(address)}
                        className="text-[#6b7280] hover:text-[#ff4444] text-xs font-mono transition-colors"
                      >
                        remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/?wallet=${encodeURIComponent(address)}`}
                        className="nav-link text-xs font-mono"
                      >
                        {truncateWallet(address)}
                      </Link>
                      <button
                        onClick={() => handleRemove(address)}
                        className="text-[#6b7280] hover:text-[#ff4444] text-xs font-mono transition-colors"
                      >
                        remove
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[#ff4444] font-bold font-mono text-base">${r.totalLeakageUsd.toFixed(2)}</span>
                        <span className="text-[#6b7280] text-xs font-mono">{r.transactionCount} swaps</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-bold font-mono text-xl ${getGrade(r.totalLeakageUsd).color}`}>
                          {getGrade(r.totalLeakageUsd).grade}
                        </span>
                        {r.personality && (
                          <span className="text-[#6b7280] text-xs font-mono">
                            {r.personality.emoji} {r.personality.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Referral */}
        <Link
          href="/referral"
          className="border border-[#1f2937] rounded-lg bg-[#111111] px-5 py-4 flex items-center justify-between hover:border-[#2d3748] transition-colors group"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-white text-xs font-mono font-bold">Earn 50% per referral</span>
            <span className="text-[#6b7280] text-[11px] font-mono">Share your link and earn on every subscription.</span>
          </div>
          <span className="text-[#00ff88] text-xs font-mono group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>

      </div>
    </main>
  );
}
