'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';

const TREASURY_WALLET = 'DfQgaajq6LfcLHZuqRC36GoWbH9iqw8hGGnkCXcNbRiH';
const TOTAL_SECONDS = 30 * 60;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function PayContent() {
  const params = useSearchParams();
  const router = useRouter();
  const wallet = params.get('wallet') ?? '';
  const amount = params.get('amount') ?? '';
  const solanaPayUrl = params.get('url') ?? params.get('solanaPayUrl') ?? '';
  const plan = params.get('plan') === 'signals' ? 'signals' : 'pro';

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState<'wallet' | 'amount' | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!solanaPayUrl && !amount) return;

    const url = solanaPayUrl ||
      `solana:${TREASURY_WALLET}?amount=${amount}&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&label=RektReceipt%20Pro&message=Upgrade%20to%20Pro`;

    QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: '#14f195', light: '#111111' } })
      .then(setQrDataUrl)
      .catch(() => null);
  }, [solanaPayUrl, amount]);

  useEffect(() => {
    if (!amount) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setStatus('expired');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/verify?amount=${encodeURIComponent(amount)}`);
        const data = await res.json();
        if (data.status === 'confirmed') {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setStatus('confirmed');
          router.push(`/upgrade/success?wallet=${encodeURIComponent(wallet)}&session_id=crypto&plan=${plan}`);
        } else if (data.status === 'expired') {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setStatus('expired');
        }
      } catch {
        // network error — keep polling
      }
    }, 3000);

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
    };
  }, [amount, wallet, router]);

  async function handleCopy(field: 'wallet' | 'amount') {
    const text = field === 'wallet' ? TREASURY_WALLET : amount;
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  if (status === 'expired') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-red-400 font-mono text-sm">Payment expired — start over.</p>
        <Link href="/upgrade" className="nav-link text-[#14f195] text-xs font-mono">
          ← Back to upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">

      {/* Amount */}
      <div className="text-center">
        <p className="text-[#555] text-xs font-mono tracking-widest mb-2">
          {plan === 'signals' ? 'Signals Plan — $14.99/month' : 'Pro Plan — $4.99/month'}
        </p>
        <p className="text-3xl font-bold font-mono text-white">{amount}</p>
        <p className="text-[#14f195] text-xs font-mono tracking-widest mt-1">USDC</p>
        <p className="text-[#444] text-[11px] font-mono mt-2">Billed monthly. Cancel anytime by stopping renewal.</p>
      </div>

      {/* QR Code */}
      {qrDataUrl ? (
        <div className="border border-[#1a1a1a] rounded-lg p-3 bg-[#111]">
          <img src={qrDataUrl} alt="Solana Pay QR Code" width={240} height={240} />
        </div>
      ) : (
        <div className="w-[256px] h-[256px] border border-[#1a1a1a] rounded-lg bg-[#111] animate-pulse" />
      )}

      {/* Scan hint */}
      <p className="text-[#555] text-xs font-mono text-center">
        Open Phantom &rarr; tap the scan icon &rarr; scan this code
      </p>

      {/* Divider */}
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 border-t border-[#1a1a1a]" />
        <span className="text-[#333] text-xs font-mono tracking-widest">OR SEND MANUALLY</span>
        <div className="flex-1 border-t border-[#1a1a1a]" />
      </div>

      {/* Manual payment fields */}
      <div className="w-full flex flex-col gap-2">
        <div className="border border-[#1a1a1a] rounded-lg bg-[#111] p-4 flex flex-col gap-2">
          <p className="text-[#444] text-xs font-mono tracking-widest">AMOUNT (USDC)</p>
          <div className="flex gap-2 items-center">
            <span className="flex-1 text-white text-sm font-mono font-bold">{amount}</span>
            <button
              onClick={() => handleCopy('amount')}
              className="border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] px-3 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap"
            >
              {copied === 'amount' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="border border-[#1a1a1a] rounded-lg bg-[#111] p-4 flex flex-col gap-2">
          <p className="text-[#444] text-xs font-mono tracking-widest">SEND TO</p>
          <div className="flex gap-2 items-center">
            <span className="flex-1 text-[#666] text-xs font-mono break-all">{TREASURY_WALLET}</span>
            <button
              onClick={() => handleCopy('wallet')}
              className="border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] px-3 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap"
            >
              {copied === 'wallet' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="flex items-center gap-2">
        <span className="text-[#444] text-xs font-mono">Expires in</span>
        <span className={`font-bold font-mono text-sm ${timeLeft < 120 ? 'text-red-400' : 'text-white'}`}>
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Warning */}
      <p className="text-[#333] text-xs font-mono text-center">
        Send USDC on Solana only. Other networks will be lost.
      </p>

      {/* Status */}
      <p className="text-[#555] text-xs font-mono animate-pulse">Waiting for payment...</p>

    </div>
  );
}

export default function PayPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 py-16">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="w-[256px] h-[256px] border border-[#1a1a1a] rounded-lg bg-[#111] animate-pulse" />
          <p className="text-[#444] text-xs font-mono">Loading...</p>
        </div>
      }>
        <PayContent />
      </Suspense>
    </main>
  );
}
