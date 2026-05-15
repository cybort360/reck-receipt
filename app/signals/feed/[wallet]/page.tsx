'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface SignalProvider {
  wallet: string;
  name: string;
  rektScore: number;
  grade: string;
  subscribers: number;
  priceUsdc: number;
}

interface SignalCall {
  id: string;
  mint: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  note: string;
  timestamp: number;
}

function pnl(direction: 'buy' | 'sell', entry: number, current: number): number {
  if (entry === 0) return 0;
  return direction === 'buy'
    ? ((current - entry) / entry) * 100
    : ((entry - current) / entry) * 100;
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatPrice(price: number): string {
  if (price === 0) return '—';
  return price < 0.01 ? `$${price.toFixed(6)}` : `$${price.toFixed(4)}`;
}

function gradeColorClass(grade: string): string {
  if (grade === 'S' || grade === 'A') return 'text-[#00ff88]';
  if (grade === 'B') return 'text-[#ffd700]';
  if (grade === 'C' || grade === 'D') return 'text-[#ff8800]';
  return 'text-[#ff4444]';
}

function LockedState({
  provider,
  providerWallet,
}: {
  provider: SignalProvider | null;
  providerWallet: string;
}) {
  return (
    <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-6 flex flex-col items-center gap-4 text-center">
      <span className="text-2xl">🔒</span>
      {provider ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-white font-bold font-mono">{provider.name}</span>
            <span className={`text-sm font-bold font-mono ${gradeColorClass(provider.grade)}`}>
              Score {provider.rektScore} · {provider.grade}
            </span>
          </div>
          <p className="text-[#6b7280] text-xs font-mono">
            Subscribe to access this signal feed.
          </p>
          <Link
            href={`/signals/subscribe/${providerWallet}`}
            className="bg-[#00ff88] text-black font-bold py-2 px-6 rounded text-sm font-mono hover:bg-[#00e67a] transition-colors"
          >
            Subscribe · ${provider.priceUsdc}/mo
          </Link>
        </>
      ) : (
        <>
          <p className="text-[#6b7280] text-xs font-mono">
            You need an active subscription to view this feed.
          </p>
          <Link
            href={`/signals/subscribe/${providerWallet}`}
            className="bg-[#00ff88] text-black font-bold py-2 px-6 rounded text-sm font-mono hover:bg-[#00e67a] transition-colors"
          >
            Subscribe
          </Link>
        </>
      )}
      <Link href="/signals" className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
        ← Back to marketplace
      </Link>
    </div>
  );
}

function SignalCard({
  call,
  livePrice,
}: {
  call: SignalCall;
  livePrice: number | undefined;
}) {
  const current = livePrice ?? call.currentPrice;
  const p = pnl(call.direction, call.entryPrice, current);
  const pnlColor = p >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]';
  const hasLive = livePrice !== undefined;

  return (
    <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 flex flex-col gap-3 hover:border-[#2d3748] transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
              call.direction === 'buy'
                ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
                : 'bg-[#ff4444]/10 text-[#ff4444] border border-[#ff4444]/30'
            }`}
          >
            {call.direction.toUpperCase()}
          </span>
          <span className="text-white font-bold font-mono text-sm">{call.symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          {current > 0 && (
            <span className={`text-sm font-bold font-mono ${pnlColor}`}>
              {p >= 0 ? '+' : ''}{p.toFixed(2)}%
            </span>
          )}
          <span className="text-[#6b7280] text-xs font-mono">{relativeTime(call.timestamp)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-[#374151] tracking-widest">ENTRY</span>
          <span className="text-xs font-mono text-[#9ca3af]">{formatPrice(call.entryPrice)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-[#374151] tracking-widest">
            CURRENT{hasLive && <span className="text-[#00ff88]/50 ml-1">●</span>}
          </span>
          <span className="text-xs font-mono text-[#9ca3af]">{formatPrice(current)}</span>
        </div>
      </div>

      {call.note && (
        <p className="text-[#6b7280] text-xs font-mono leading-relaxed border-t border-[#1f2937] pt-3">
          {call.note}
        </p>
      )}
    </div>
  );
}

function FeedContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const providerWallet = params.wallet as string;
  const subscriberWallet = searchParams.get('subscriber') ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<SignalProvider | null>(null);
  const [calls, setCalls] = useState<SignalCall[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      try {
        const fetchPromises: [Promise<Response>, Promise<Response>, Promise<Response> | null] = [
          fetch(`/api/signals/provider/${encodeURIComponent(providerWallet)}`),
          fetch(`/api/signals/calls/${encodeURIComponent(providerWallet)}`),
          subscriberWallet
            ? fetch(
                `/api/signals/access?subscriber=${encodeURIComponent(subscriberWallet)}&provider=${encodeURIComponent(providerWallet)}`,
              )
            : null,
        ];

        const [provRes, callsRes, accessRes] = await Promise.all(
          fetchPromises.map((p) => p ?? Promise.resolve(null)),
        );

        if ((provRes as Response).status === 404) {
          setError('Provider not found.');
          return;
        }
        if (!(provRes as Response).ok) {
          setError('Failed to load feed. Try again.');
          return;
        }

        const provData: SignalProvider = await (provRes as Response).json();
        setProvider(provData);

        const access =
          accessRes && (accessRes as Response).ok
            ? ((await (accessRes as Response).json()) as { hasAccess: boolean }).hasAccess
            : false;
        setHasAccess(access);

        if (access && (callsRes as Response).ok) {
          const callsData: SignalCall[] = await (callsRes as Response).json();
          setCalls(callsData);

          const mints = [...new Set(callsData.map((c) => c.mint))];
          if (mints.length > 0) {
            fetch(`https://api.jup.ag/price/v2?ids=${mints.map(encodeURIComponent).join(',')}`)
              .then((r) => r.json())
              .then((data) => {
                const prices: Record<string, number> = {};
                for (const [m, info] of Object.entries(
                  data.data as Record<string, { price: string } | null>,
                )) {
                  if (info?.price) prices[m] = parseFloat(info.price);
                }
                setLivePrices(prices);
              })
              .catch(() => null);
          }
        }
      } catch {
        setError('Network error. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [providerWallet, subscriberWallet]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10">
      <div className="max-w-lg mx-auto flex flex-col gap-5">

        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-mono hover:opacity-80 transition-opacity">
            RektReceipt
          </Link>
          <Link href="/signals" className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
            ← Marketplace
          </Link>
        </div>

        {loading && (
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 h-24" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 h-28" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="border border-[#ff4444]/30 bg-[#ff4444]/5 rounded-lg p-4 flex flex-col gap-3">
            <p className="text-[#ff4444] text-xs font-mono">{error}</p>
            <Link href="/signals" className="text-[#00ff88] text-xs font-mono hover:underline">
              ← Back to marketplace
            </Link>
          </div>
        )}

        {!loading && !error && hasAccess === false && (
          <LockedState provider={provider} providerWallet={providerWallet} />
        )}

        {!loading && !error && hasAccess === true && provider && (
          <>
            {/* Provider header */}
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-white font-bold font-mono">{provider.name}</span>
                <span className="text-[#6b7280] text-xs font-mono">
                  {provider.subscribers} subscriber{provider.subscribers !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold font-mono ${gradeColorClass(provider.grade)}`}>
                  {provider.grade}
                </span>
                <p className="text-[#6b7280] text-[10px] font-mono">Score {provider.rektScore}</p>
              </div>
            </div>

            {/* Signal feed */}
            {calls.length === 0 ? (
              <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-6 text-center">
                <p className="text-[#6b7280] text-xs font-mono">No signals posted yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[#374151] text-[11px] font-mono px-1">
                  {calls.length} signal{calls.length !== 1 ? 's' : ''} ·{' '}
                  live prices via Jupiter
                  <span className="text-[#00ff88]/50 ml-1">●</span>
                </p>
                {calls.map((call) => (
                  <SignalCard
                    key={call.id}
                    call={call}
                    livePrice={livePrices[call.mint]}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10 flex items-center justify-center">
          <div className="w-full max-w-lg flex flex-col gap-3 animate-pulse">
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] h-20" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-[#1f2937] rounded-lg bg-[#111111] h-28" />
            ))}
          </div>
        </main>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
