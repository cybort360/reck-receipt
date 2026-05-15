'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RugRadarPage() {
  const router = useRouter();
  const [mint, setMint] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = mint.trim();
    if (trimmed) router.push(`/token/${trimmed}`);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4 gap-8">

      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-bold font-mono tracking-widest text-white">RUG RADAR</h1>
            <Link href="/" className="nav-link text-[#444] text-xs font-mono hover:text-[#888] transition-colors">
              ← Back
            </Link>
          </div>
          <p className="text-[#555] text-sm font-mono leading-relaxed">
            Paste any Solana token mint address to see its reputation across audited wallets.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder="token mint address..."
            autoFocus
            className="w-full bg-[#111] border border-[#2a2a2a] rounded px-4 py-3 font-mono text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors"
          />
          <button
            type="submit"
            disabled={!mint.trim()}
            className="w-full bg-[#14f195] text-black font-bold py-2.5 rounded hover:bg-[#10d980] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono text-sm"
          >
            Check Token
          </button>
        </form>

        <p className="text-[#2a2a2a] text-xs font-mono text-center">
          Reputation is based on RektReceipt-audited wallets only.
        </p>

      </div>

    </main>
  );
}
