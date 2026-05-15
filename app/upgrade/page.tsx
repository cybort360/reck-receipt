'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const FREE_FEATURES = [
  '100 transactions analyzed',
  '2 dashboard wallets',
  'Fee breakdown by token',
  'Degen report card',
  'Shareable receipt link',
  'Leaderboard ranking',
];

const PRO_FEATURES = [
  '500 transactions analyzed',
  '10 dashboard wallets',
  'Wallet Watch (coming soon)',
  'Everything in Free',
];

function Check({ dim }: { dim?: boolean }) {
  return <span className={dim ? 'text-[#6b7280]' : 'text-[#00ff88]'}>✓</span>;
}

export default function UpgradePage() {
  const router = useRouter();
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create payment session');
      const data = await res.json();
      router.push(
        `/pay?wallet=${encodeURIComponent(wallet.trim())}&amount=${encodeURIComponent(data.amount)}&url=${encodeURIComponent(data.solanaPayUrl)}`,
      );
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-[#00ff88]">Upgrade</h1>
          <Link href="/" className="nav-link text-xs font-mono">
            ← Back
          </Link>
        </div>

        <p className="text-[#6b7280] text-sm font-mono -mt-4">
          Get deeper analysis across your full trading history.
        </p>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Free */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-4">
            <div>
              <p className="text-xs font-mono text-[#6b7280] tracking-widest mb-1">FREE</p>
              <p className="text-2xl font-bold font-mono text-white">$0</p>
              <p className="text-xs font-mono text-[#6b7280] mt-0.5">forever</p>
            </div>
            <ul className="flex flex-col gap-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs font-mono text-[#9ca3af]">
                  <Check dim />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <Link
                href="/"
                className="block w-full text-center border border-[#1f2937] text-[#6b7280] py-2 rounded text-xs font-mono hover:border-[#2d3748] hover:text-[#9ca3af] transition-colors"
              >
                Current plan
              </Link>
            </div>
          </div>

          {/* Pro */}
          <div className="border border-[#00ff88]/20 rounded-lg bg-[#111111] p-5 flex flex-col gap-4 relative">
            <div className="absolute top-3 right-3 bg-[#00ff88] text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded">
              PRO
            </div>
            <div>
              <p className="text-xs font-mono text-[#00ff88] tracking-widest mb-1">PRO</p>
              <p className="text-2xl font-bold font-mono text-white">$4.99</p>
              <p className="text-xs font-mono text-[#6b7280] mt-0.5">one-time</p>
            </div>
            <ul className="flex flex-col gap-2">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs font-mono text-[#9ca3af]">
                  <Check />
                  <span className={f.includes('coming soon') ? 'text-[#6b7280]' : ''}>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <div className="block w-full text-center border border-[#00ff88]/30 text-[#00ff88] py-2 rounded text-xs font-mono">
                Upgrade below ↓
              </div>
            </div>
          </div>

        </div>

        {/* Upgrade form */}
        <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-4">
          <p className="text-xs font-mono text-[#00ff88] tracking-widest">GET PRO</p>
          <form onSubmit={handleUpgrade} className="flex flex-col gap-3">
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="your wallet address..."
              className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
            />
            <button
              type="submit"
              disabled={loading || !wallet.trim()}
              className="w-full bg-[#00ff88] text-black font-bold py-2 rounded hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-sm"
            >
              {loading ? 'Loading…' : 'Pay with USDC — $4.99'}
            </button>
          </form>
          {error && <p className="text-[#ff4444] text-xs font-mono">{error}</p>}
          <p className="text-[#6b7280] text-xs font-mono">One-time payment. No subscription.</p>
        </div>

      </div>
    </main>
  );
}
