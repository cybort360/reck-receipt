'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const FREE_FEATURES = [
  'Audit any wallet',
  'See your RektScore',
  'Basic results only',
];

const PRO_FEATURES = [
  'Unlimited dashboard wallets',
  'Wallet Watch weekly emails',
  'Full audit history',
  'Alpha Feed',
  'Rug Radar',
  'Token Graveyard',
  'Rekt Wrapped (monthly recap)',
];

const SIGNALS_FEATURES = [
  'Everything in Pro',
  'Signal Marketplace access',
  'Agent context on every signal',
];

function Check({ dim }: { dim?: boolean }) {
  return <span className={dim ? 'text-[#4b5563]' : 'text-[#00ff88]'}>✓</span>;
}

export default function UpgradePage() {
  const router = useRouter();
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState<'pro' | 'signals' | null>(null);
  const [error, setError] = useState('');

  async function handleSubscribe(plan: 'pro' | 'signals') {
    if (!wallet.trim() || loading) return;
    setLoading(plan);
    setError('');
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.trim(), plan }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      router.push(
        `/pay?wallet=${encodeURIComponent(wallet.trim())}&amount=${encodeURIComponent(data.amount)}&url=${encodeURIComponent(data.solanaPayUrl)}&plan=${plan}`,
      );
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-[#00ff88]">Upgrade</h1>
          <Link href="/" className="nav-link text-xs font-mono">← Back</Link>
        </div>

        <p className="text-[#6b7280] text-sm font-mono -mt-4">
          Pick a plan. Pay with USDC on Solana.
        </p>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">

          {/* Free */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-4">
            <div>
              <p className="text-xs font-mono text-[#6b7280] tracking-widest mb-1">FREE</p>
              <p className="text-2xl font-bold font-mono text-white">$0</p>
              <p className="text-xs font-mono text-[#4b5563] mt-0.5">forever</p>
            </div>
            <ul className="flex flex-col gap-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs font-mono text-[#6b7280]">
                  <Check dim />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="pt-1">
              <div className="w-full text-center border border-[#1f2937] text-[#4b5563] py-2 rounded text-xs font-mono">
                Current plan
              </div>
            </div>
          </div>

          {/* Pro */}
          <div className="border border-[#00ff88]/30 rounded-lg bg-[#111111] p-5 flex flex-col gap-4 relative">
            <div className="absolute -top-px left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="bg-[#00ff88] text-black text-[10px] font-bold font-mono px-3 py-0.5 rounded-b block">
                Most Popular
              </span>
            </div>
            <div className="pt-4">
              <p className="text-xs font-mono text-[#00ff88] tracking-widest mb-1">PRO</p>
              <p className="text-2xl font-bold font-mono text-white">$4.99</p>
              <p className="text-xs font-mono text-[#6b7280] mt-0.5">/month</p>
            </div>
            <ul className="flex flex-col gap-2">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs font-mono text-[#9ca3af]">
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="pt-1">
              <button
                onClick={() => handleSubscribe('pro')}
                disabled={!wallet.trim() || loading !== null}
                className="w-full bg-[#00ff88] text-black font-bold py-2 rounded text-xs font-mono hover:bg-[#00e67a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading === 'pro' ? 'Loading…' : 'Subscribe with USDC'}
              </button>
            </div>
          </div>

          {/* Signals */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-4">
            <div>
              <p className="text-xs font-mono text-[#6b7280] tracking-widest mb-1">SIGNALS</p>
              <p className="text-2xl font-bold font-mono text-white">$14.99</p>
              <p className="text-xs font-mono text-[#6b7280] mt-0.5">/month</p>
            </div>
            <ul className="flex flex-col gap-2">
              {SIGNALS_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs font-mono text-[#9ca3af]">
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="pt-1">
              <button
                onClick={() => handleSubscribe('signals')}
                disabled={!wallet.trim() || loading !== null}
                className="w-full border border-[#00ff88]/30 text-[#00ff88] font-bold py-2 rounded text-xs font-mono hover:bg-[#00ff88]/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading === 'signals' ? 'Loading…' : 'Subscribe with USDC'}
              </button>
            </div>
          </div>

        </div>

        {/* Wallet input */}
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="Enter your wallet address to subscribe…"
            className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2.5 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
          />
          {error && <p className="text-[#ff4444] text-xs font-mono">{error}</p>}
          <p className="text-[#374151] text-xs font-mono">
            Payments processed in USDC on Solana. No credit card required.
          </p>
        </div>

      </div>
    </main>
  );
}
