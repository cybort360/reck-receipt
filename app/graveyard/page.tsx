'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface GraveyardToken {
  mint: string;
  symbol: string | null;
  rugCount: number;
}

function truncateMint(mint: string): string {
  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
}

function skulls(rugCount: number): string {
  if (rugCount >= 100) return '☠☠☠';
  if (rugCount >= 50) return '☠☠';
  return '☠';
}

export default function GraveyardPage() {
  const [tokens, setTokens] = useState<GraveyardToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/graveyard')
      .then((r) => r.json())
      .then(setTokens)
      .catch(() => setError('Failed to load graveyard data.'))
      .finally(() => setLoading(false));
  }, []);

  const totalWallets = tokens.reduce((sum, t) => sum + t.rugCount, 0);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-12 flex flex-col items-center gap-8">

      {/* Header */}
      <div className="w-full max-w-lg flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold font-mono tracking-widest text-[#00ff88]">TOKEN GRAVEYARD</h1>
          <Link href="/" className="nav-link text-xs font-mono">
            ← Back
          </Link>
        </div>
        <p className="text-[#6b7280] text-xs font-mono">
          Tokens that rugged the most RektReceipt wallets
        </p>
      </div>

      {/* Content */}
      {loading && (
        <div className="w-full max-w-lg border border-[#1f2937] rounded-lg bg-[#111111] p-8 flex items-center justify-center">
          <p className="text-[#6b7280] text-xs font-mono animate-pulse">Loading...</p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-lg border border-red-900/40 rounded-lg bg-[#111111] p-6 text-center">
          <p className="text-[#ff4444] text-xs font-mono">{error}</p>
        </div>
      )}

      {!loading && !error && tokens.length === 0 && (
        <div className="w-full max-w-lg border border-[#1f2937] rounded-lg bg-[#111111] p-8 flex flex-col items-center gap-4 text-center">
          <p className="text-[#6b7280] text-xs font-mono leading-relaxed">
            Not enough data yet. Empty states fill as more wallets get audited.
          </p>
          <Link
            href="/"
            className="border border-[#1f2937] hover:border-[#2d3748] text-[#9ca3af] hover:text-white px-4 py-2 rounded text-xs font-mono transition-colors"
          >
            Audit a Wallet
          </Link>
        </div>
      )}

      {!loading && tokens.length > 0 && (
        <div className="w-full max-w-lg flex flex-col gap-2">

          {/* Column labels */}
          <div className="flex items-center gap-4 px-4 pb-1">
            <span className="w-6 text-[#374151] text-xs font-mono">#</span>
            <span className="flex-1 text-[#374151] text-xs font-mono">TOKEN</span>
            <span className="text-[#374151] text-xs font-mono">RUG COUNT</span>
          </div>

          {tokens.map((token, i) => (
            <div
              key={token.mint}
              className="flex flex-col gap-2 border border-[#1f2937] hover:border-red-900/30 rounded-lg bg-[#111111] hover:bg-[#161f2e] px-4 py-3 transition-colors group"
            >
              {/* Top row */}
              <div className="flex items-center gap-4">
                <span className="w-6 text-[#6b7280] text-xs font-mono text-right shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <Link
                    href={`/token/${token.mint}`}
                    className="nav-link text-white text-sm font-mono font-bold group-hover:text-[#ff4444] transition-colors w-fit"
                  >
                    {token.symbol ?? '???'}
                  </Link>
                  <span className="text-[#6b7280] text-xs font-mono">{truncateMint(token.mint)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[#ff4444] font-bold font-mono text-sm">
                    {token.rugCount.toLocaleString()}
                  </span>
                  <span className="text-[#ff4444] text-xs leading-none" title={`${token.rugCount} rug victims`}>
                    {skulls(token.rugCount)}
                  </span>
                </div>
              </div>

              {/* Bottom row: DexScreener link */}
              <div className="pl-10">
                <a
                  href={`https://dexscreener.com/solana/${token.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6b7280] hover:text-white text-[10px] font-mono transition-colors"
                >
                  View on DexScreener →
                </a>
              </div>
            </div>
          ))}

          {/* Footer note */}
          <p className="text-[#374151] text-xs font-mono text-center pt-2">
            Data from {totalWallets.toLocaleString()} audited wallets
          </p>

        </div>
      )}

    </main>
  );
}
