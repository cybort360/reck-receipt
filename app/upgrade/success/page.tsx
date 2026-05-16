'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

const UNLOCKED = [
  '500 transactions per audit',
  '10 wallets in dashboard',
  'Wallet Watch (coming soon)',
];

const CONFETTI_COLORS = ['#00ff88', '#ffffff', '#00cc66', '#88ffcc'];
const CONFETTI_DURATION = 3000;

function useConfetti() {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;

    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.2,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      size: Math.random() * 4 + 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    }));

    const gravity = 0.12;
    const start = performance.now();
    let rafId: number;

    function draw(now: number) {
      if (now - start > CONFETTI_DURATION) {
        canvas.remove();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      canvas.remove();
    };
  }, []);
}

function SuccessContent() {
  const params = useSearchParams();
  const wallet = params.get('wallet') ?? '';
  const sessionId = params.get('session_id') ?? '';
  const refCode = params.get('ref');
  const isDevMode = sessionId === 'dev_mock';
  const [granted, setGranted] = useState(false);

  useConfetti();
  const [activatedDate] = useState(() =>
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  );

  useEffect(() => {
    if (isDevMode && wallet) {
      fetch('/api/pro/grant-dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      }).then(() => setGranted(true));
    } else {
      setGranted(true);
    }
  }, [wallet, isDevMode]);

  useEffect(() => {
    if (refCode) {
      fetch('/api/referral/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: refCode }),
      }).catch(() => null);
    }
  }, [refCode]);

  return (
    <div className="flex flex-col items-center gap-6">

      {/* Receipt card */}
      <div className="border border-green-900/50 rounded-lg bg-[#111] w-full max-w-sm font-mono text-sm">

        {/* Header row */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-white font-bold tracking-widest text-xs">REKTRECEIPT PRO</span>
          <span className="text-[#14f195] font-bold tracking-widest text-xs">SUBSCRIPTION ACTIVE</span>
        </div>

        <div className="border-t border-[#1a1a1a] mx-5" />

        {/* Wallet */}
        <div className="px-5 py-4">
          <span className="text-[#555] text-xs tracking-widest">WALLET</span>
          <p className="text-white mt-1 text-sm">{wallet ? truncateWallet(wallet) : '—'}</p>
        </div>

        <div className="border-t border-dashed border-[#1a1a1a] mx-5" />

        {/* Unlocked features */}
        <div className="px-5 py-4 flex flex-col gap-2">
          {UNLOCKED.map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <span className="text-[#14f195] mt-px">+</span>
              <span className={feature.includes('coming soon') ? 'text-[#555]' : 'text-[#aaa]'}>
                {feature}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1a1a1a] mx-5" />

        {/* Footer */}
        <div className="px-5 py-4">
          <span className="text-[#444] text-xs">Monthly subscription activated · {activatedDate}</span>
        </div>

      </div>

      {/* Dev mode label */}
      {isDevMode && (
        <p className="text-[#444] text-xs font-mono">dev mode — pro granted locally</p>
      )}

      {/* Buttons */}
      {granted && (
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <div className="flex items-center gap-3">
            <Link
              href={wallet ? `/?wallet=${encodeURIComponent(wallet)}` : '/'}
              className="bg-[#14f195] text-black font-bold px-6 py-2 rounded-full hover:bg-[#10d980] transition-colors text-sm font-mono"
            >
              Run full audit
            </Link>
            <Link
              href="/dashboard"
              className="border border-[#444] text-white px-6 py-2 rounded-full hover:border-[#888] transition-colors text-sm font-mono"
            >
              Dashboard
            </Link>
          </div>
          {wallet && (
            <a
              href={`https://t.me/RektReceiptBot?start=${encodeURIComponent(wallet)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center border border-[#1f2937] text-[#9ca3af] px-6 py-2 rounded-full hover:border-[#374151] hover:text-white transition-colors text-sm font-mono"
            >
              Enable Telegram Alerts
            </a>
          )}
        </div>
      )}

    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="border border-green-900/50 rounded-lg bg-[#111] w-full max-w-sm p-8 flex items-center justify-center">
          <span className="text-[#444] text-xs font-mono tracking-widest">LOADING...</span>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
