'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ScoreLookupPage() {
  const [wallet, setWallet] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = wallet.trim();
    if (!w) return;
    router.push(`/score/${w}`);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div>
          <Link href="/" className="text-xl font-bold font-mono hover:opacity-80 transition-opacity">
            RektReceipt
          </Link>
          <h2 className="text-[#00ff88] text-xs tracking-widest font-mono mt-1">REKT SCORE LOOKUP</h2>
          <p className="text-[#6b7280] text-xs font-mono mt-2">
            Check any wallet&apos;s execution score, grade, and breakdown.
          </p>
        </div>

        <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="wallet address..."
              aria-label="Wallet address"
              autoFocus
              className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
            />
            <button
              type="submit"
              disabled={!wallet.trim()}
              className="w-full bg-[#00ff88] text-black font-bold py-2 rounded text-sm font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Look Up Score
            </button>
          </form>

          <p className="text-[#374151] text-[11px] font-mono border-t border-[#1f2937] pt-3">
            Scores are generated when a wallet is audited. No score yet?{' '}
            <Link href="/" className="text-[#00ff88] hover:underline">
              Run an audit first.
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Link href="/leaderboard" className="nav-link text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
            Top scores →
          </Link>
          <Link href="/signals" className="nav-link text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
            Signal marketplace →
          </Link>
        </div>

      </div>
    </main>
  );
}
