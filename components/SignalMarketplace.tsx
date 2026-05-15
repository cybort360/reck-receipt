'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface ProviderCard {
  wallet: string;
  name: string;
  rektScore: number;
  grade: string;
  priceUsdc: number;
  subscribers: number;
}

type Filter = 'all' | 'grade-sa' | 'under-20' | 'most-subs';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'grade-sa', label: 'Grade S / A' },
  { id: 'under-20', label: 'Under $20/mo' },
  { id: 'most-subs', label: 'Most Subscribers' },
];

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function gradeColorClass(grade: string): string {
  if (grade === 'S' || grade === 'A') return 'text-[#00ff88] border-[#00ff88]/40';
  if (grade === 'B') return 'text-[#ffd700] border-[#ffd700]/40';
  if (grade === 'C' || grade === 'D') return 'text-[#ff8800] border-[#ff8800]/40';
  return 'text-[#ff4444] border-[#ff4444]/40';
}

function applyFilter(providers: ProviderCard[], filter: Filter): ProviderCard[] {
  let list = [...providers];

  if (filter === 'grade-sa') {
    list = list.filter((p) => p.grade === 'S' || p.grade === 'A');
  } else if (filter === 'under-20') {
    list = list.filter((p) => p.priceUsdc < 20);
  }

  if (filter === 'most-subs') {
    list.sort((a, b) => b.subscribers - a.subscribers);
  }
  // all other filters: already sorted by rektScore desc from server

  return list;
}

function ProviderCardItem({ provider }: { provider: ProviderCard }) {
  const gradeCls = gradeColorClass(provider.grade);

  return (
    <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 flex flex-col gap-3 hover:border-[#2d3748] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-white font-bold font-mono text-sm leading-tight line-clamp-1">
          {provider.name}
        </span>
        <span className={`shrink-0 text-xs font-bold font-mono px-1.5 py-0.5 rounded border ${gradeCls}`}>
          {provider.grade}
        </span>
      </div>

      <Link
        href={`/score/${provider.wallet}`}
        className="text-[#6b7280] text-xs font-mono hover:text-[#00ff88] transition-colors self-start"
      >
        {truncateWallet(provider.wallet)}
      </Link>

      <div className="grid grid-cols-3 gap-2 border-t border-[#1f2937] pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-[#374151] tracking-widest">SCORE</span>
          <span className={`text-sm font-bold font-mono ${gradeColorClass(provider.grade).split(' ')[0]}`}>
            {provider.rektScore}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-[#374151] tracking-widest">SUBS</span>
          <span className="text-sm font-bold font-mono text-white">{provider.subscribers}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-[#374151] tracking-widest">PRICE</span>
          <span className="text-sm font-bold font-mono text-white">${provider.priceUsdc}/mo</span>
        </div>
      </div>

      <Link
        href={`/signals/subscribe/${provider.wallet}`}
        className="mt-auto w-full text-center border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10 py-2 rounded text-xs font-mono font-bold transition-colors"
      >
        Subscribe
      </Link>
    </div>
  );
}

export function SignalMarketplace({ providers }: { providers: ProviderCard[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const visible = applyFilter(providers, filter);

  return (
    <div className="flex flex-col gap-6">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              filter === id
                ? 'bg-[#00ff88] text-black font-bold'
                : 'border border-[#1f2937] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#2d3748]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <p className="text-[#6b7280] text-xs font-mono py-6 text-center">
          {providers.length === 0
            ? 'No signal providers yet. Be the first.'
            : 'No providers match this filter.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((p) => (
            <ProviderCardItem key={p.wallet} provider={p} />
          ))}
        </div>
      )}

      {visible.length > 0 && (
        <p className="text-[#374151] text-[11px] font-mono text-center">
          {visible.length} provider{visible.length !== 1 ? 's' : ''} ·{' '}
          RektScores verified on-chain
        </p>
      )}
    </div>
  );
}
