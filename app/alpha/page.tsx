'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AlphaToken {
  mint: string;
  symbol: string | null;
  alphaWalletCount: number;
  avgSwaps: number;
  avgEfficiencyScore?: number;
  efficiencyLabel?: string;
}

function efficiencyBadgeClass(label: string): string {
  if (label === 'Elite' || label === 'Sharp') {
    return 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/5';
  }
  if (label === 'Average') {
    return 'text-[#6b7280] border-[#374151] bg-[#1f2937]/50';
  }
  return 'text-[#ff4444]/70 border-[#ff4444]/20 bg-[#ff4444]/5'; // Sloppy
}

const JUPITER_REFERRAL = 'DfQgaajq6LfcLHZuqRC36GoWbH9iqw8hGGnkCXcNbRiH';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 border border-[#1f2937] hover:border-[#2d3748] text-[#6b7280] hover:text-[#9ca3af] px-2 py-0.5 rounded text-[10px] font-mono transition-colors"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ transition: 'all 0.2s ease' }}
      className="shrink-0 border border-[#374151] text-[#9ca3af] hover:border-[#00ff88] hover:text-[#00ff88] px-2.5 py-0.5 rounded text-[10px] font-mono"
    >
      {label}
    </a>
  );
}

export default function AlphaPage() {
  const [tokens, setTokens] = useState<AlphaToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/alpha')
      .then((r) => r.json())
      .then(setTokens)
      .catch(() => setError('Failed to load alpha feed.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-12 flex flex-col items-center gap-8">

      {/* Header */}
      <div className="w-full max-w-2xl flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold font-mono tracking-widest text-[#00ff88]">ALPHA FEED</h1>
          <Link href="/" className="nav-link text-xs font-mono">
            ← Back
          </Link>
        </div>
        <p className="text-[#6b7280] text-xs font-mono">
          Tokens being traded by the highest-grade wallets
        </p>
        <p className="text-[#374151] text-[11px] font-mono mt-0.5">
          Ranked by execution efficiency relative to trade volume, not raw profitability.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="w-full max-w-2xl border border-[#1f2937] rounded-lg bg-[#111111] p-8 flex items-center justify-center">
          <p className="text-[#6b7280] text-xs font-mono animate-pulse">Loading...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="w-full max-w-2xl border border-red-900/40 rounded-lg bg-[#111111] p-6 text-center">
          <p className="text-[#ff4444] text-xs font-mono">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && tokens.length === 0 && (
        <div className="w-full max-w-2xl border border-[#1f2937] rounded-lg bg-[#111111] p-8 flex flex-col items-center gap-4 text-center">
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

      {/* List */}
      {!loading && tokens.length > 0 && (
        <div className="w-full max-w-2xl flex flex-col gap-2">

          {/* Column labels */}
          <div className="flex items-center gap-4 px-4 pb-1">
            <span className="w-6 text-[#374151] text-xs font-mono shrink-0">#</span>
            <span className="flex-1 text-[#374151] text-xs font-mono">TOKEN</span>
            <span className="text-[#374151] text-xs font-mono">WALLETS TRADING</span>
          </div>

          {tokens.map((token, i) => (
            <div
              key={token.mint}
              className="flex flex-col gap-2 border border-[#1f2937] hover:border-[#00ff88]/20 rounded-lg bg-[#111111] px-4 py-3 transition-colors group"
            >
              {/* Top row: rank, symbol, avg swaps */}
              <div className="flex items-center gap-4">
                <span className="w-6 text-[#6b7280] text-xs font-mono text-right shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/token/${token.mint}`}
                      className="nav-link text-white text-sm font-mono font-bold group-hover:text-[#00ff88] transition-colors"
                    >
                      {token.symbol ?? token.mint.slice(0, 8) + '…'}
                    </Link>
                    {token.efficiencyLabel && (
                      <span className={`text-[10px] font-mono font-bold border px-1.5 py-0.5 rounded ${efficiencyBadgeClass(token.efficiencyLabel)}`}>
                        {token.efficiencyLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-[#6b7280] text-xs font-mono">
                    {token.alphaWalletCount === 1
                      ? '1 high-efficiency wallet trading this'
                      : `${token.alphaWalletCount} high-efficiency wallets trading this`}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[#00ff88] font-bold font-mono text-sm">{token.alphaWalletCount}</span>
                </div>
              </div>

              {/* Bottom row: full mint + copy + action buttons */}
              <div className="flex items-center gap-2 pl-10">
                <span className="flex-1 min-w-0 text-[#374151] text-[10px] font-mono truncate">
                  {token.mint}
                </span>
                <CopyButton text={token.mint} />
                <ActionButton
                  href={`https://jup.ag/swap/SOL-${token.mint}?referral=${JUPITER_REFERRAL}&feeBps=50`}
                  label="Buy on Jupiter"
                />
                <ActionButton
                  href={`https://axiom.trade/t/${token.mint}?ref=woctane`}
                  label="Axiom"
                />
              </div>
            </div>
          ))}

          {/* Disclaimer */}
          <p className="text-[#374151] text-xs font-mono text-center pt-2">
            Based on audited wallet data. Not financial advice.
          </p>

        </div>
      )}

    </main>
  );
}
