'use client';

import { useState, useEffect, useCallback } from 'react';

interface PayoutRequest {
  wallet: string;
  amount: number;
  requestedAt: number;
  status: 'pending' | 'paid';
}

interface SignalProvider {
  wallet: string;
  name: string;
  rektScore: number;
  subscribers: number;
}

interface Stats {
  walletsAudited: number;
  totalProviders: number;
  activeSubscriptions: number;
  pendingPayouts: number;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-4">
      <p className="text-[#6b7280] text-xs font-mono tracking-widest">{title}</p>
      {children}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-[#1f2937] rounded px-4 py-3 flex flex-col gap-1">
      <span className="text-[#6b7280] text-[11px] font-mono">{label}</span>
      <span className="text-white font-bold font-mono text-xl">{value}</span>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [authing, setAuthing] = useState(false);

  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [providers, setProviders] = useState<SignalProvider[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [resolvingWallet, setResolvingWallet] = useState<string | null>(null);
  const [removingWallet, setRemovingWallet] = useState<string | null>(null);

  const adminFetch = useCallback(
    (url: string, opts: RequestInit = {}) =>
      fetch(url, {
        ...opts,
        headers: { 'x-admin-token': token, 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
      }),
    [token],
  );

  const loadAll = useCallback(async () => {
    const [payoutsRes, providersRes, statsRes] = await Promise.all([
      adminFetch('/api/admin/payouts'),
      adminFetch('/api/admin/providers'),
      adminFetch('/api/admin/stats'),
    ]);
    if (payoutsRes.ok) {
      const d = await payoutsRes.json();
      setPayouts(d.payouts ?? []);
    }
    if (providersRes.ok) {
      const d = await providersRes.json();
      setProviders(d.providers ?? []);
    }
    if (statsRes.ok) {
      setStats(await statsRes.json());
    }
  }, [adminFetch]);

  useEffect(() => {
    if (token) void loadAll();
  }, [token, loadAll]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthing(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.status === 401) {
        setAuthError('Invalid password');
        return;
      }
      const { token: t } = await res.json();
      setToken(t);
    } catch {
      setAuthError('Network error. Try again.');
    } finally {
      setAuthing(false);
    }
  }

  async function handleResolve(wallet: string) {
    setResolvingWallet(wallet);
    try {
      await adminFetch('/api/admin/payouts/resolve', {
        method: 'POST',
        body: JSON.stringify({ wallet }),
      });
      setPayouts((prev) => prev.filter((p) => p.wallet !== wallet));
    } finally {
      setResolvingWallet(null);
    }
  }

  async function handleRemove(wallet: string) {
    if (!confirm(`Remove provider ${wallet.slice(0, 8)}…? This cannot be undone.`)) return;
    setRemovingWallet(wallet);
    try {
      await adminFetch('/api/admin/providers/remove', {
        method: 'POST',
        body: JSON.stringify({ wallet }),
      });
      setProviders((prev) => prev.filter((p) => p.wallet !== wallet));
    } finally {
      setRemovingWallet(null);
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="text-[#00ff88] text-xs tracking-widest font-mono text-center">ADMIN</p>
          <form onSubmit={handleAuth} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full bg-[#111111] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#2d3748]"
            />
            {authError && (
              <p className="text-[#ff4444] text-xs font-mono">{authError}</p>
            )}
            <button
              type="submit"
              disabled={authing || !password}
              className="w-full bg-[#00ff88] text-black font-bold py-2 rounded text-sm font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {authing ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-xl font-bold font-mono">RektReceipt</p>
            <p className="text-[#00ff88] text-xs tracking-widest font-mono mt-0.5">ADMIN</p>
          </div>
          <button
            type="button"
            onClick={() => setToken('')}
            className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Platform Stats */}
        <Section title="PLATFORM STATS">
          {stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Wallets audited" value={stats.walletsAudited} />
              <StatBox label="Signal providers" value={stats.totalProviders} />
              <StatBox label="Active subscriptions" value={stats.activeSubscriptions} />
              <StatBox label="Pending payouts" value={stats.pendingPayouts} />
            </div>
          ) : (
            <p className="text-[#6b7280] text-xs font-mono">Loading…</p>
          )}
        </Section>

        {/* Pending Payouts */}
        <Section title="PENDING PAYOUTS">
          {payouts.length === 0 ? (
            <p className="text-[#374151] text-xs font-mono">No pending payouts.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {payouts.map((p) => (
                <div
                  key={p.wallet}
                  className="flex items-center justify-between border border-[#1f2937] rounded px-3 py-3 gap-4"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-white text-xs font-mono truncate">
                      {p.wallet.slice(0, 8)}…{p.wallet.slice(-6)}
                    </span>
                    <span className="text-[#6b7280] text-[11px] font-mono">
                      ${p.amount.toFixed(2)} USDC · {new Date(p.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleResolve(p.wallet)}
                    disabled={resolvingWallet === p.wallet}
                    className="shrink-0 border border-[#00ff88]/40 text-[#00ff88] text-[11px] font-mono px-3 py-1.5 rounded hover:bg-[#00ff88]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resolvingWallet === p.wallet ? 'Saving…' : 'Mark Paid'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Signal Providers */}
        <Section title="SIGNAL PROVIDERS">
          {providers.length === 0 ? (
            <p className="text-[#374151] text-xs font-mono">No providers registered.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {providers.map((p) => (
                <div
                  key={p.wallet}
                  className="flex items-center justify-between border border-[#1f2937] rounded px-3 py-3 gap-4"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-white text-xs font-mono font-bold">{p.name}</span>
                    <span className="text-[#6b7280] text-[11px] font-mono truncate">
                      {p.wallet.slice(0, 8)}…{p.wallet.slice(-6)}
                    </span>
                    <span className="text-[#374151] text-[11px] font-mono">
                      Score: {p.rektScore} · {p.subscribers} subscriber{p.subscribers !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemove(p.wallet)}
                    disabled={removingWallet === p.wallet}
                    className="shrink-0 border border-[#ff4444]/40 text-[#ff4444] text-[11px] font-mono px-3 py-1.5 rounded hover:bg-[#ff4444]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {removingWallet === p.wallet ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Recent Errors */}
        <Section title="RECENT ERRORS">
          <p className="text-[#6b7280] text-xs font-mono">
            View exceptions, traces, and performance data in Sentry.
          </p>
          <a
            href="https://sentry.io/organizations/rektreceipt/issues/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00ff88] text-xs font-mono hover:opacity-80 transition-opacity"
          >
            Open Sentry dashboard →
          </a>
        </Section>

      </div>
    </main>
  );
}
