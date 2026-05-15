'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface TokenData {
  mint: string;
  symbol: string | null;
  traderCount: number;
  rugCount: number;
  rugScore: number;
  rating: 'SAFE' | 'CAUTION' | 'LIKELY RUG' | 'RUN';
}

function truncateMint(mint: string): string {
  return `${mint.slice(0, 6)}...${mint.slice(-6)}`;
}

function scoreColor(rugScore: number): string {
  if (rugScore < 10) return '#00ff88';
  if (rugScore < 30) return '#facc15';
  if (rugScore < 60) return '#fb923c';
  return '#ff4444';
}

function ratingColor(rating: string): string {
  if (rating === 'SAFE') return '#00ff88';
  if (rating === 'CAUTION') return '#facc15';
  if (rating === 'LIKELY RUG') return '#fb923c';
  return '#ff4444';
}

export default function TokenPage() {
  const { mint } = useParams<{ mint: string }>();
  const router = useRouter();

  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setData(null);

    fetch(`/api/token/${mint}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Failed to load token data.'))
      .finally(() => setLoading(false));
  }, [mint]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = search.trim();
    if (trimmed) router.push(`/token/${trimmed}`);
  }

  const color = data ? scoreColor(data.rugScore) : '#555';

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 py-12 flex flex-col items-center gap-8">

      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between">
        <p className="text-[#00ff88] text-xs font-mono tracking-widest">TOKEN SCAN</p>
        <Link href="/" className="nav-link text-xs font-mono">
          ← Back
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="w-full max-w-sm flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="enter mint address..."
          className="flex-1 bg-[#111111] border border-[#1f2937] rounded px-3 py-2 font-mono text-xs text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
        />
        <button
          type="submit"
          disabled={!search.trim()}
          className="border border-[#1f2937] text-[#9ca3af] hover:text-white hover:border-[#2d3748] px-4 py-2 rounded text-xs font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Scan
        </button>
      </form>

      {/* Content */}
      {loading && (
        <div className="w-full max-w-sm border border-[#1f2937] rounded-lg bg-[#111111] p-8 flex items-center justify-center">
          <p className="text-[#6b7280] text-xs font-mono animate-pulse">Loading...</p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-sm border border-red-900/40 rounded-lg bg-[#111111] p-6 text-center">
          <p className="text-[#ff4444] text-xs font-mono">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="w-full max-w-sm flex flex-col gap-4">

          {/* Identity */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-1">
            <p className="text-white text-lg font-bold font-mono">
              {data.symbol ?? '???'}
            </p>
            <p className="text-[#6b7280] text-xs font-mono break-all">{truncateMint(data.mint)}</p>
          </div>

          {/* Rug score */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-6 flex flex-col items-center gap-3">
            <p className="text-[#6b7280] text-xs font-mono tracking-widest">RUG SCORE</p>
            <p className="text-6xl font-bold font-mono" style={{ color }}>
              {data.rugScore}%
            </p>
            <p
              className="text-sm font-bold font-mono tracking-widest px-3 py-1 rounded border"
              style={{ color: ratingColor(data.rating), borderColor: ratingColor(data.rating) + '55' }}
            >
              {data.rating}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 flex flex-col gap-1">
              <p className="text-[#6b7280] text-xs font-mono tracking-widest">TRADERS</p>
              <p className="text-white text-2xl font-bold font-mono">{data.traderCount.toLocaleString()}</p>
            </div>
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 flex flex-col gap-1">
              <p className="text-[#6b7280] text-xs font-mono tracking-widest">RUG WALLETS</p>
              <p className="text-2xl font-bold font-mono" style={{ color: ratingColor(data.rating) }}>
                {data.rugCount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Buy links */}
          <div className="flex gap-2">
            <a
              href={`https://jup.ag/swap/SOL-${data.mint}?referral=DfQgaajq6LfcLHZuqRC36GoWbH9iqw8hGGnkCXcNbRiH&feeBps=50`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center border border-[#00ff88]/30 text-[#00ff88]/70 hover:border-[#00ff88]/60 hover:text-[#00ff88] py-2 rounded text-xs font-mono transition-colors"
            >
              Buy on Jupiter
            </a>
            <a
              href={`https://axiom.trade/t/${data.mint}?ref=woctane`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center border border-[#1f2937] text-[#6b7280] hover:border-[#2d3748] hover:text-[#9ca3af] py-2 rounded text-xs font-mono transition-colors"
            >
              Axiom
            </a>
          </div>

          <p className="text-[#374151] text-xs font-mono text-center">
            Based on wallets that audited this token via RektReceipt.
          </p>

        </div>
      )}

    </main>
  );
}
