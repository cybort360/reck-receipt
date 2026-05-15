'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function maskWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

type Channel = 'email' | 'telegram';

interface WatchStatus {
  watching: boolean;
  config?: {
    email: string | null;
    telegramChatId: string | null;
    registeredAt: number;
  };
}

function WatchContent() {
  const params = useSearchParams();

  const [wallet, setWallet] = useState('');
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [channel, setChannel] = useState<Channel>('email');
  const [contactValue, setContactValue] = useState('');
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlWallet = params.get('wallet');
    const storedWallet = typeof window !== 'undefined'
      ? localStorage.getItem('rektreceipt-last-wallet') ?? ''
      : '';
    const resolved = urlWallet || storedWallet;
    if (!resolved) {
      setLoading(false);
      return;
    }
    setWallet(resolved);

    Promise.all([
      fetch(`/api/pro/status?wallet=${encodeURIComponent(resolved)}`).then((r) => r.json()),
      fetch(`/api/watch/status?wallet=${encodeURIComponent(resolved)}`).then((r) => r.json()),
    ]).then(([proData, watchData]: [{ isPro: boolean }, WatchStatus]) => {
      setIsPro(proData.isPro);
      setStatus(watchData);
      if (watchData.watching && watchData.config) {
        if (watchData.config.email) {
          setChannel('email');
          setContactValue(watchData.config.email);
        } else if (watchData.config.telegramChatId) {
          setChannel('telegram');
          setContactValue(watchData.config.telegramChatId);
        }
      }
    }).catch(() => setIsPro(false)).finally(() => setLoading(false));
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !contactValue.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const body: Record<string, string> = { wallet };
      if (channel === 'email') body.email = contactValue.trim();
      else body.telegramChatId = contactValue.trim();

      const res = await fetch('/api/watch/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Registration failed');
      }
      setStatus({
        watching: true,
        config: {
          email: channel === 'email' ? contactValue.trim() : null,
          telegramChatId: channel === 'telegram' ? contactValue.trim() : null,
          registeredAt: Date.now(),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnwatch() {
    if (!wallet) return;
    setSubmitting(true);
    setError('');
    try {
      await fetch('/api/watch/unregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });
      setStatus({ watching: false });
      setContactValue('');
    } catch {
      setError('Failed to unwatch. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-4 bg-[#1a1a1a] rounded w-1/3" />
        <div className="h-4 bg-[#1a1a1a] rounded w-1/2" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="text-[#666] text-sm font-mono">
        No wallet found.{' '}
        <Link href="/" className="nav-link">Run an audit first</Link>
      </div>
    );
  }

  if (isPro === false) {
    return (
      <div className="border border-[#1a1a1a] rounded-lg bg-[#111] p-6 flex flex-col gap-3">
        <p className="text-xs font-mono text-[#14f195] tracking-widest">WALLET WATCH</p>
        <p className="text-white text-sm font-mono">Wallet Watch is a Pro feature.</p>
        <p className="text-[#555] text-xs font-mono">
          Get notified weekly about your swap fees and execution quality.
        </p>
        <Link
          href="/upgrade"
          className="mt-2 inline-block bg-[#14f195] text-black font-bold px-4 py-2 rounded text-sm font-mono hover:bg-[#10d980] transition-colors text-center"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Watching confirmation card */}
      {status?.watching && status.config && (
        <div className="border border-green-900/50 rounded-lg bg-[#111] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-[#14f195] tracking-widest">WATCHING</p>
            <span className="text-[#14f195] text-xs font-mono">active</span>
          </div>
          <div className="flex flex-col gap-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#555]">Wallet</span>
              <span className="text-white">{maskWallet(wallet)}</span>
            </div>
            {status.config.email && (
              <div className="flex justify-between">
                <span className="text-[#555]">Email</span>
                <span className="text-white">{status.config.email}</span>
              </div>
            )}
            {status.config.telegramChatId && (
              <div className="flex justify-between">
                <span className="text-[#555]">Telegram</span>
                <span className="text-white">{status.config.telegramChatId}</span>
              </div>
            )}
          </div>
          <p className="text-[#444] text-xs font-mono">Weekly summaries enabled.</p>
          <button
            onClick={handleUnwatch}
            disabled={submitting}
            className="w-full border border-red-900/50 text-red-400 hover:border-red-700 hover:text-red-300 py-2 rounded text-xs font-mono transition-colors disabled:opacity-50"
          >
            {submitting ? 'Removing...' : 'Unwatch this wallet'}
          </button>
        </div>
      )}

      {/* Registration form */}
      {!status?.watching && (
        <div className="border border-[#1a1a1a] rounded-lg bg-[#111] p-5 flex flex-col gap-4">
          <p className="text-xs font-mono text-[#14f195] tracking-widest">WALLET WATCH</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Read-only wallet field */}
            <div className="flex flex-col gap-1">
              <label className="text-[#555] text-xs font-mono">Wallet</label>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded px-3 py-2 font-mono text-sm text-[#666]">
                {maskWallet(wallet)}
              </div>
            </div>

            {/* Channel toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-[#555] text-xs font-mono">Notify via</label>
              <div className="flex gap-3">
                {(['email', 'telegram'] as Channel[]).map((c) => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="channel"
                      value={c}
                      checked={channel === c}
                      onChange={() => { setChannel(c); setContactValue(''); }}
                      className="accent-[#14f195]"
                    />
                    <span className="text-xs font-mono text-[#888] capitalize">{c === 'telegram' ? 'Telegram' : 'Email'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contact input */}
            <div className="flex flex-col gap-1">
              <label className="text-[#555] text-xs font-mono">
                {channel === 'email' ? 'Email address' : 'Telegram Chat ID'}
              </label>
              <input
                type={channel === 'email' ? 'email' : 'text'}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder={channel === 'email' ? 'you@example.com' : '123456789'}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444]"
              />
            </div>

            {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !contactValue.trim()}
              className="w-full bg-[#14f195] text-black font-bold py-2 rounded hover:bg-[#10d980] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-mono"
            >
              {submitting ? 'Saving...' : 'Watch this wallet'}
            </button>
          </form>
        </div>
      )}

      {/* Edit button when watching */}
      {status?.watching && (
        <button
          onClick={() => setStatus({ watching: false })}
          className="text-[#444] text-xs font-mono hover:text-[#888] transition-colors text-center"
        >
          Edit notification settings
        </button>
      )}

    </div>
  );
}

export default function WatchPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono">Wallet Watch</h1>
          <Link href="/" className="nav-link text-[#444] text-xs font-mono hover:text-[#888] transition-colors">
            ← Audit
          </Link>
        </div>
        <p className="text-[#555] text-sm font-mono -mt-2">
          Get weekly fee summaries delivered to your inbox or Telegram.
        </p>
        <Suspense fallback={
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-4 bg-[#1a1a1a] rounded w-1/3" />
            <div className="h-4 bg-[#1a1a1a] rounded w-1/2" />
          </div>
        }>
          <WatchContent />
        </Suspense>
      </div>
    </main>
  );
}
