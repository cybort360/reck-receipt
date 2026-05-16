'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface SignalProvider {
  wallet: string;
  name: string;
  bio: string;
  priceUsdc: number;
  rektScore: number;
  grade: string;
  subscribers: number;
  createdAt: number;
}

interface SignalCall {
  id: string;
  providerWallet: string;
  mint: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  note: string;
  timestamp: number;
  status?: 'open' | 'closed';
  closedAt?: number;
  closedPrice?: number;
  finalPnlPercent?: number;
}

type SolanaWallet = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (msg: Uint8Array, enc: string) => Promise<{ signature: Uint8Array }>;
};

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

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function gradeColor(grade: string): string {
  if (grade === 'S' || grade === 'A') return 'text-[#00ff88]';
  if (grade === 'B') return 'text-[#ffd700]';
  if (grade === 'C' || grade === 'D') return 'text-[#ff8800]';
  return 'text-[#ff4444]';
}

export default function DashboardPage() {
  const [connectedWallet, setConnectedWallet] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<SignalProvider | null>(null);
  const [calls, setCalls] = useState<SignalCall[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  const [mint, setMint] = useState('');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [entryPrice, setEntryPrice] = useState('');
  const [note, setNote] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState(false);

  const [earnings, setEarnings] = useState<number | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  const mintDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fetchingMintPrice, setFetchingMintPrice] = useState(false);
  const [entryPriceAutoFilled, setEntryPriceAutoFilled] = useState(false);

  async function fetchLivePrices(mints: string[]) {
    if (mints.length === 0) return;
    try {
      const res = await fetch(
        `https://api.jup.ag/price/v2?ids=${mints.map(encodeURIComponent).join(',')}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const updated: Record<string, number> = {};
      for (const [m, info] of Object.entries(
        data.data as Record<string, { price: string } | null>,
      )) {
        if (info?.price) updated[m] = parseFloat(info.price);
      }
      setLivePrices((prev) => ({ ...prev, ...updated }));
    } catch {
      // live prices are best-effort
    }
  }

  async function fetchMintPrice(mintAddr: string) {
    setFetchingMintPrice(true);
    try {
      const res = await fetch(
        `https://api.jup.ag/price/v2?ids=${encodeURIComponent(mintAddr)}`,
      );
      if (!res.ok) return;
      const data = await res.json() as { data: Record<string, { price: string } | null> };
      const priceStr = data.data[mintAddr]?.price;
      if (priceStr) {
        const price = parseFloat(priceStr);
        if (Number.isFinite(price) && price > 0) {
          setEntryPrice(String(price));
          setEntryPriceAutoFilled(true);
        }
      }
    } catch {
      // best-effort, no error state
    } finally {
      setFetchingMintPrice(false);
    }
  }

  async function loadDashboard(w: string) {
    setLoading(true);
    setLoadError(null);
    setProvider(null);
    setCalls([]);
    setLivePrices({});

    try {
      const [provRes, callsRes] = await Promise.all([
        fetch(`/api/signals/provider/${encodeURIComponent(w)}`),
        fetch(`/api/signals/calls/${encodeURIComponent(w)}`),
      ]);

      if (provRes.status === 404) {
        setLoadError('Not a registered signal provider. Apply first.');
        return;
      }
      if (!provRes.ok) {
        setLoadError('Failed to load provider profile. Try again.');
        return;
      }

      const provData: SignalProvider = await provRes.json();
      const callsData: SignalCall[] = callsRes.ok ? await callsRes.json() : [];

      setProvider(provData);
      setCalls(callsData);

      const uniqueMints = [...new Set(callsData.map((c) => c.mint))];
      void fetchLivePrices(uniqueMints);

      fetch(`/api/signals/earnings/${encodeURIComponent(w)}`)
        .then((r) => r.json())
        .then((data: { earnings: number }) => setEarnings(data.earnings))
        .catch(() => null);
    } catch {
      setLoadError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setSigning(true);
    setSignError(null);

    try {
      const solana = (window as unknown as { solana?: SolanaWallet }).solana;
      if (!solana) {
        setSignError('No Solana wallet found. Install Phantom or Backpack.');
        return;
      }

      const { publicKey } = await solana.connect();
      const wallet = publicKey.toString();

      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });
      if (!nonceRes.ok) {
        setSignError('Failed to get sign-in message. Try again.');
        return;
      }
      const { message } = (await nonceRes.json()) as { message: string };

      const sig = await solana.signMessage(new TextEncoder().encode(message), 'utf8');
      const signatureBase64 = Buffer.from(sig.signature).toString('base64');

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, signature: signatureBase64 }),
      });
      if (!verifyRes.ok) {
        setSignError('Signature verification failed. Try again.');
        return;
      }
      const { token } = (await verifyRes.json()) as { token: string };

      setConnectedWallet(wallet);
      setSessionToken(token);
      await loadDashboard(wallet);
    } catch (err) {
      if ((err as { code?: number }).code === 4001) {
        setSignError('Signature rejected. You must sign to continue.');
      } else {
        setSignError('Wallet connection failed. Try again.');
      }
    } finally {
      setSigning(false);
    }
  }

  function handleDisconnect() {
    setConnectedWallet('');
    setSessionToken('');
    setProvider(null);
    setCalls([]);
    setLivePrices({});
    setLoadError(null);
    setEarnings(null);
    setPayoutSuccess(false);
  }

  async function handlePostSignal(e: React.FormEvent) {
    e.preventDefault();
    if (!provider || !sessionToken) return;
    setPosting(true);
    setPostError(null);
    setPostSuccess(false);

    try {
      const res = await fetch('/api/signals/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({
          wallet: connectedWallet,
          mint: mint.trim(),
          direction,
          entryPrice: parseFloat(entryPrice),
          note: note.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPostError((data as { error?: string }).error ?? 'Failed to post signal.');
        return;
      }

      const { call }: { call: SignalCall } = await res.json();
      setCalls((prev) => [call, ...prev].slice(0, 20));
      void fetchLivePrices([call.mint]);

      setMint('');
      setEntryPrice('');
      setNote('');
      setEntryPriceAutoFilled(false);
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 3000);
    } catch {
      setPostError('Network error. Try again.');
    } finally {
      setPosting(false);
    }
  }

  async function handlePayoutRequest() {
    if (!connectedWallet || earnings === null || earnings <= 0) return;
    setPayoutLoading(true);
    setPayoutError(null);
    setPayoutSuccess(false);

    try {
      const res = await fetch('/api/signals/payout-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({ providerWallet: connectedWallet, amount: earnings }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPayoutError((data as { error?: string }).error ?? 'Failed to submit payout request.');
        return;
      }

      setPayoutSuccess(true);
    } catch {
      setPayoutError('Network error. Try again.');
    } finally {
      setPayoutLoading(false);
    }
  }

  const monthlyEarnings = provider ? provider.subscribers * provider.priceUsdc : 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xl font-bold font-mono hover:opacity-80 transition-opacity">
              RektReceipt
            </Link>
            <h2 className="text-[#00ff88] text-xs tracking-widest font-mono mt-1">SIGNAL PROVIDER DASHBOARD</h2>
          </div>
          <Link href="/" className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
            ← Home
          </Link>
        </div>

        {/* Wallet auth */}
        {!provider && (
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
            <p className="text-[#6b7280] text-xs font-mono tracking-widest">SIGN IN</p>

            {!connectedWallet ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleSignIn()}
                  disabled={signing || loading}
                  className="w-full bg-[#00ff88] text-black font-bold py-2 rounded text-sm font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {signing ? 'Connecting…' : loading ? 'Loading…' : 'Sign in with Wallet'}
                </button>
                {signError && (
                  <div className="border border-[#ff4444]/30 bg-[#ff4444]/5 rounded px-3 py-3">
                    <p className="text-[#ff4444] text-xs font-mono">{signError}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[#9ca3af] text-xs font-mono">
                    {connectedWallet.slice(0, 4)}...{connectedWallet.slice(-4)}
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
                {loading && (
                  <p className="text-[#6b7280] text-xs font-mono">Loading dashboard…</p>
                )}
              </>
            )}

            {loadError && (
              <div className="border border-[#ff4444]/30 bg-[#ff4444]/5 rounded px-3 py-3 flex flex-col gap-1">
                <p className="text-[#ff4444] text-xs font-mono">{loadError}</p>
                {loadError.includes('Apply first') && (
                  <Link href="/signals/apply" className="text-[#00ff88] text-xs font-mono hover:underline">
                    Apply as a Signal Provider →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Provider profile */}
        {provider && (
          <>
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-white font-bold font-mono text-base">{provider.name}</span>
                  <span className="text-[#6b7280] text-xs font-mono">{truncateWallet(provider.wallet)}</span>
                  {provider.bio && (
                    <p className="text-[#9ca3af] text-xs font-mono mt-1 leading-relaxed">{provider.bio}</p>
                  )}
                </div>
                <div className="shrink-0 text-right flex flex-col items-end gap-1">
                  <span className={`text-2xl font-bold font-mono ${gradeColor(provider.grade)}`}>
                    {provider.grade}
                  </span>
                  <p className="text-[#6b7280] text-[10px] font-mono">Score {provider.rektScore}</p>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-[#6b7280] text-[10px] font-mono hover:text-[#9ca3af] transition-colors mt-1"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-[#1f2937] pt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[#6b7280] tracking-widest">SUBSCRIBERS</span>
                  <span className="text-white font-bold font-mono">{provider.subscribers}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[#6b7280] tracking-widest">PRICE / MO</span>
                  <span className="text-white font-bold font-mono">${provider.priceUsdc} USDC</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[#6b7280] tracking-widest">EST. EARNINGS</span>
                  <span className="text-[#00ff88] font-bold font-mono">${monthlyEarnings}/mo</span>
                </div>
              </div>
            </div>

            {/* Post Signal form */}
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-[#6b7280] text-xs font-mono tracking-widest">POST SIGNAL</p>
              <form onSubmit={handlePostSignal} className="flex flex-col gap-4">

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#6b7280] text-xs font-mono">Token Mint</label>
                  <input
                    type="text"
                    value={mint}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMint(val);
                      setEntryPriceAutoFilled(false);
                      if (mintDebounceRef.current) clearTimeout(mintDebounceRef.current);
                      if (val.trim()) {
                        mintDebounceRef.current = setTimeout(
                          () => void fetchMintPrice(val.trim()),
                          500,
                        );
                      }
                    }}
                    onBlur={(e) => {
                      if (mintDebounceRef.current) clearTimeout(mintDebounceRef.current);
                      if (e.target.value.trim()) void fetchMintPrice(e.target.value.trim());
                    }}
                    placeholder="token mint address..."
                    required
                    className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#6b7280] text-xs font-mono">Direction</label>
                  <div className="flex rounded overflow-hidden border border-[#1f2937]">
                    <button
                      type="button"
                      onClick={() => setDirection('buy')}
                      className={`flex-1 py-2 text-xs font-mono font-bold transition-colors ${
                        direction === 'buy'
                          ? 'bg-[#00ff88] text-black'
                          : 'bg-[#0a0a0a] text-[#6b7280] hover:text-[#9ca3af]'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('sell')}
                      className={`flex-1 py-2 text-xs font-mono font-bold transition-colors ${
                        direction === 'sell'
                          ? 'bg-[#ff4444] text-white'
                          : 'bg-[#0a0a0a] text-[#6b7280] hover:text-[#9ca3af]'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-[#6b7280] text-xs font-mono">Entry Price (USDC)</label>
                    {fetchingMintPrice && (
                      <span className="text-[#374151] text-[11px] font-mono">fetching…</span>
                    )}
                    {entryPriceAutoFilled && !fetchingMintPrice && (
                      <span className="text-[#374151] text-[11px] font-mono">
                        Auto-filled from Jupiter. Edit if needed.
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={entryPrice}
                    onChange={(e) => {
                      setEntryPrice(e.target.value);
                      setEntryPriceAutoFilled(false);
                    }}
                    placeholder="0.00"
                    min={0}
                    step="any"
                    required
                    className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#6b7280] text-xs font-mono">
                    Note
                    <span className="text-[#374151] ml-2">{note.length}/280</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 280))}
                    maxLength={280}
                    rows={3}
                    placeholder="your thesis for this trade..."
                    className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748] resize-none"
                  />
                </div>

                {postError && <p className="text-[#ff4444] text-xs font-mono">{postError}</p>}
                {postSuccess && <p className="text-[#00ff88] text-xs font-mono">Signal posted.</p>}

                <button
                  type="submit"
                  disabled={posting || !mint.trim() || !entryPrice}
                  className="w-full bg-[#00ff88] text-black font-bold py-2 rounded text-sm font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {posting ? 'Posting…' : 'Post Signal'}
                </button>
              </form>
            </div>

            {/* Earnings & payout */}
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-[#6b7280] text-xs font-mono tracking-widest">EARNINGS</p>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[#6b7280] tracking-widest">CLAIMABLE</span>
                  <span className="text-[#00ff88] font-bold font-mono text-lg">
                    {earnings === null ? '…' : `$${earnings.toFixed(2)} USDC`}
                  </span>
                </div>

                {!payoutSuccess ? (
                  <button
                    type="button"
                    onClick={() => void handlePayoutRequest()}
                    disabled={payoutLoading || earnings === null || earnings <= 0}
                    className="bg-[#00ff88] text-black font-bold px-4 py-2 rounded text-xs font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {payoutLoading ? 'Requesting…' : 'Request Payout'}
                  </button>
                ) : null}
              </div>

              {payoutError && (
                <p className="text-[#ff4444] text-xs font-mono">{payoutError}</p>
              )}

              {payoutSuccess && (
                <div className="border border-[#00ff88]/20 bg-[#00ff88]/5 rounded px-3 py-3">
                  <p className="text-[#00ff88] text-xs font-mono">
                    Payout requested. We process payouts every Monday. USDC will be sent to your wallet.
                  </p>
                </div>
              )}
            </div>

            {/* Signal calls table */}
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-[#6b7280] text-xs font-mono tracking-widest">
                RECENT SIGNALS
                {calls.length > 0 && <span className="text-[#374151] ml-2">({calls.length})</span>}
              </p>

              {calls.length === 0 ? (
                <p className="text-[#374151] text-xs font-mono">No signals posted yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono border-collapse">
                    <thead>
                      <tr className="text-[#6b7280] tracking-widest border-b border-[#1f2937]">
                        <th className="text-left pb-2 pr-3 font-normal">TOKEN</th>
                        <th className="text-left pb-2 pr-3 font-normal">DIR</th>
                        <th className="text-right pb-2 pr-3 font-normal">ENTRY</th>
                        <th className="text-right pb-2 pr-3 font-normal">CURRENT</th>
                        <th className="text-right pb-2 pr-3 font-normal">PNL %</th>
                        <th className="text-right pb-2 font-normal">TIME</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calls.map((call) => {
                        const isClosed = call.status === 'closed';
                        const current = isClosed
                          ? (call.closedPrice ?? call.currentPrice)
                          : (livePrices[call.mint] ?? call.currentPrice);
                        const p = isClosed
                          ? (call.finalPnlPercent ?? 0)
                          : pnl(call.direction, call.entryPrice, current);
                        const pnlColor = isClosed
                          ? 'text-white'
                          : p >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]';
                        return (
                          <tr
                            key={call.id}
                            className="border-b border-[#1f2937] hover:bg-[#161f2e] transition-colors"
                          >
                            <td className="py-2 pr-3 text-white">{call.symbol}</td>
                            <td
                              className={`py-2 pr-3 font-bold ${call.direction === 'buy' ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}
                            >
                              {call.direction.toUpperCase()}
                              {isClosed && (
                                <span className="ml-1.5 text-[#374151] font-normal text-[9px] tracking-widest">
                                  CLOSED
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3 text-right text-[#9ca3af]">
                              ${call.entryPrice < 0.01
                                ? call.entryPrice.toFixed(6)
                                : call.entryPrice.toFixed(4)}
                            </td>
                            <td className="py-2 pr-3 text-right text-[#9ca3af]">
                              {isClosed
                                ? (current > 0
                                    ? `$${current < 0.01 ? current.toFixed(6) : current.toFixed(4)}`
                                    : '—')
                                : (current > 0
                                    ? `$${current < 0.01 ? current.toFixed(6) : current.toFixed(4)}`
                                    : '—')}
                            </td>
                            <td className={`py-2 pr-3 text-right font-bold ${pnlColor}`}>
                              {isClosed
                                ? `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`
                                : (current > 0
                                    ? `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`
                                    : '—')}
                            </td>
                            <td className="py-2 text-right text-[#6b7280]">
                              {relativeTime(isClosed && call.closedAt ? call.closedAt : call.timestamp)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
