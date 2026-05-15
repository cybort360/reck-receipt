'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';

interface SignalProvider {
  wallet: string;
  name: string;
  bio: string;
  priceUsdc: number;
  rektScore: number;
  grade: string;
  subscribers: number;
}

type Phase =
  | { name: 'loading' }
  | { name: 'provider-error'; message: string }
  | { name: 'input'; createError: string | null; creating: boolean }
  | { name: 'payment'; amount: string; solanaPayUrl: string; treasuryWallet: string }
  | { name: 'expired' }
  | { name: 'confirmed' };

const TOTAL_SECONDS = 30 * 60;

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function gradeColorClass(grade: string): string {
  if (grade === 'S' || grade === 'A') return 'text-[#00ff88]';
  if (grade === 'B') return 'text-[#ffd700]';
  if (grade === 'C' || grade === 'D') return 'text-[#ff8800]';
  return 'text-[#ff4444]';
}

function ProviderCard({ provider }: { provider: SignalProvider }) {
  return (
    <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-white font-bold font-mono text-base">{provider.name}</span>
          <Link
            href={`/score/${provider.wallet}`}
            className="text-[#6b7280] text-xs font-mono hover:text-[#00ff88] transition-colors"
          >
            {truncateWallet(provider.wallet)}
          </Link>
        </div>
        <span className={`text-2xl font-bold font-mono ${gradeColorClass(provider.grade)}`}>
          {provider.grade}
        </span>
      </div>

      {provider.bio && (
        <p className="text-[#9ca3af] text-xs font-mono leading-relaxed border-t border-[#1f2937] pt-3">
          {provider.bio}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 border-t border-[#1f2937] pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-[#374151] tracking-widest">SCORE</span>
          <span className={`text-sm font-bold font-mono ${gradeColorClass(provider.grade)}`}>
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
    </div>
  );
}

export default function SubscribePage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet: providerWallet } = use(params);
  const router = useRouter();

  const [provider, setProvider] = useState<SignalProvider | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [subscriberWallet, setSubscriberWallet] = useState('');

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState<'wallet' | 'amount' | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch provider on mount
  useEffect(() => {
    fetch(`/api/signals/provider/${encodeURIComponent(providerWallet)}`)
      .then(async (res) => {
        if (res.status === 404) {
          setPhase({ name: 'provider-error', message: 'Provider not found.' });
          return;
        }
        if (!res.ok) {
          setPhase({ name: 'provider-error', message: 'Failed to load provider. Try again.' });
          return;
        }
        const data: SignalProvider = await res.json();
        setProvider(data);
        setPhase({ name: 'input', createError: null, creating: false });
      })
      .catch(() => setPhase({ name: 'provider-error', message: 'Network error. Try again.' }));
  }, [providerWallet]);

  // QR code generation when payment phase begins
  useEffect(() => {
    if (phase.name !== 'payment') return;
    QRCode.toDataURL(phase.solanaPayUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#00ff88', light: '#111111' },
    })
      .then(setQrDataUrl)
      .catch(() => null);
  }, [phase]);

  // Countdown + polling when payment phase begins
  useEffect(() => {
    if (phase.name !== 'payment') return;
    const { amount } = phase;

    setTimeLeft(TOTAL_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase({ name: 'expired' });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/signals/subscribe/verify?amount=${encodeURIComponent(amount)}`,
        );
        const data: { status: string } = await res.json();
        if (data.status === 'confirmed') {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setPhase({ name: 'confirmed' });
          router.push(
            `/signals/feed/${providerWallet}?subscriber=${encodeURIComponent(subscriberWallet)}`,
          );
        } else if (data.status === 'expired') {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setPhase({ name: 'expired' });
        }
      } catch {
        // network blip — keep polling
      }
    }, 3000);

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name]);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!provider || !subscriberWallet.trim()) return;
    setPhase({ name: 'input', createError: null, creating: true });

    try {
      const res = await fetch('/api/signals/subscribe/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberWallet: subscriberWallet.trim(),
          providerWallet,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase({ name: 'input', createError: data.error ?? 'Failed to create session.', creating: false });
        return;
      }
      setPhase({
        name: 'payment',
        amount: String(data.amount),
        solanaPayUrl: data.solanaPayUrl,
        treasuryWallet: data.treasuryWallet,
      });
    } catch {
      setPhase({ name: 'input', createError: 'Network error. Try again.', creating: false });
    }
  }

  async function handleCopy(field: 'wallet' | 'amount') {
    if (phase.name !== 'payment') return;
    const text = field === 'wallet' ? phase.treasuryWallet : phase.amount;
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-sm flex flex-col gap-5">

        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-mono hover:opacity-80 transition-opacity">
            RektReceipt
          </Link>
          <Link href="/signals" className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
            ← Marketplace
          </Link>
        </div>

        {/* Loading */}
        {phase.name === 'loading' && (
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col gap-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-[#1f2937] rounded" />
            ))}
          </div>
        )}

        {/* Provider error */}
        {phase.name === 'provider-error' && (
          <div className="border border-[#ff4444]/30 bg-[#ff4444]/5 rounded-lg p-4 flex flex-col gap-3">
            <p className="text-[#ff4444] text-xs font-mono">{phase.message}</p>
            <Link href="/signals" className="text-[#00ff88] text-xs font-mono hover:underline">
              ← Back to marketplace
            </Link>
          </div>
        )}

        {/* Input phase */}
        {provider && (phase.name === 'input') && (
          <>
            <ProviderCard provider={provider} />

            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 flex flex-col gap-4">
              <p className="text-[#6b7280] text-xs font-mono tracking-widest">YOUR WALLET</p>
              <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={subscriberWallet}
                  onChange={(e) => setSubscriberWallet(e.target.value)}
                  placeholder="your wallet address..."
                  aria-label="Your wallet address"
                  className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
                />
                {phase.createError && (
                  <p className="text-[#ff4444] text-xs font-mono">{phase.createError}</p>
                )}
                <button
                  type="submit"
                  disabled={!subscriberWallet.trim() || phase.creating}
                  className="w-full bg-[#00ff88] text-black font-bold py-2 rounded text-sm font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {phase.creating
                    ? 'Creating session…'
                    : `Subscribe for $${provider.priceUsdc}/mo`}
                </button>
              </form>
              <p className="text-[#374151] text-[11px] font-mono">
                30-day access. Pay once in USDC via Solana Pay.
              </p>
            </div>
          </>
        )}

        {/* Payment phase */}
        {phase.name === 'payment' && (
          <>
            {provider && <ProviderCard provider={provider} />}

            <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-5 flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold font-mono text-white">{phase.amount}</p>
                <p className="text-[#00ff88] text-xs font-mono tracking-widest mt-1">USDC</p>
              </div>

              {qrDataUrl ? (
                <div className="border border-[#1f2937] rounded-lg p-3 bg-[#0a0a0a]">
                  <img src={qrDataUrl} alt="Solana Pay QR" width={240} height={240} />
                </div>
              ) : (
                <div className="w-[256px] h-[256px] border border-[#1f2937] rounded-lg bg-[#0a0a0a] animate-pulse" />
              )}

              <p className="text-[#6b7280] text-xs font-mono text-center">
                Open Phantom → tap the scan icon → scan this code
              </p>

              <div className="w-full flex items-center gap-3">
                <div className="flex-1 border-t border-[#1f2937]" />
                <span className="text-[#374151] text-xs font-mono tracking-widest">OR SEND MANUALLY</span>
                <div className="flex-1 border-t border-[#1f2937]" />
              </div>

              <div className="w-full flex flex-col gap-2">
                <div className="border border-[#1f2937] rounded-lg bg-[#0a0a0a] p-4 flex flex-col gap-2">
                  <p className="text-[#374151] text-xs font-mono tracking-widest">AMOUNT (USDC)</p>
                  <div className="flex gap-2 items-center">
                    <span className="flex-1 text-white text-sm font-mono font-bold">{phase.amount}</span>
                    <button
                      onClick={() => handleCopy('amount')}
                      className="border border-[#1f2937] text-[#6b7280] hover:text-white hover:border-[#2d3748] px-3 py-1 rounded text-xs font-mono transition-colors"
                    >
                      {copied === 'amount' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="border border-[#1f2937] rounded-lg bg-[#0a0a0a] p-4 flex flex-col gap-2">
                  <p className="text-[#374151] text-xs font-mono tracking-widest">SEND TO</p>
                  <div className="flex gap-2 items-center">
                    <span className="flex-1 text-[#6b7280] text-xs font-mono break-all">
                      {phase.treasuryWallet}
                    </span>
                    <button
                      onClick={() => handleCopy('wallet')}
                      className="border border-[#1f2937] text-[#6b7280] hover:text-white hover:border-[#2d3748] px-3 py-1 rounded text-xs font-mono transition-colors shrink-0"
                    >
                      {copied === 'wallet' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#6b7280] text-xs font-mono">Expires in</span>
                <span className={`font-bold font-mono text-sm ${timeLeft < 120 ? 'text-[#ff4444]' : 'text-white'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              <p className="text-[#374151] text-xs font-mono text-center">
                Send USDC on Solana only. Other networks will be lost.
              </p>

              <p className="text-[#6b7280] text-xs font-mono animate-pulse">
                Waiting for payment…
              </p>
            </div>
          </>
        )}

        {/* Expired */}
        {phase.name === 'expired' && (
          <div className="border border-[#ff4444]/30 bg-[#ff4444]/5 rounded-lg p-5 flex flex-col items-center gap-4 text-center">
            <p className="text-[#ff4444] text-sm font-mono">Payment session expired.</p>
            <button
              onClick={() => setPhase({ name: 'input', createError: null, creating: false })}
              className="border border-[#1f2937] text-[#9ca3af] hover:text-white hover:border-[#2d3748] px-4 py-2 rounded text-xs font-mono transition-colors"
            >
              Try again
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
