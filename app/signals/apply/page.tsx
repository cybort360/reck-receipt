'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ScoreData {
  score: number;
  grade: string;
}

type CheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | { status: 'ineligible'; score: number }
  | { status: 'eligible'; score: number; grade: string };

export default function ApplyPage() {
  const router = useRouter();

  const [wallet, setWallet] = useState('');
  const [checkState, setCheckState] = useState<CheckState>({ status: 'idle' });

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [priceUsdc, setPriceUsdc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCheckEligibility(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.trim()) return;
    setCheckState({ status: 'checking' });
    setSubmitError(null);

    try {
      const res = await fetch(`/api/score/${encodeURIComponent(wallet.trim())}`);
      if (res.status === 404) {
        setCheckState({ status: 'error', message: 'No audit found for this wallet. Run an audit first.' });
        return;
      }
      if (res.status === 429) {
        setCheckState({ status: 'error', message: 'Too many requests. Wait a moment and try again.' });
        return;
      }
      if (!res.ok) {
        setCheckState({ status: 'error', message: 'Failed to fetch score. Try again.' });
        return;
      }
      const data: ScoreData = await res.json();
      if (data.score >= 70) {
        setCheckState({ status: 'eligible', score: data.score, grade: data.grade });
      } else {
        setCheckState({ status: 'ineligible', score: data.score });
      }
    } catch {
      setCheckState({ status: 'error', message: 'Network error. Check your connection and try again.' });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (checkState.status !== 'eligible') return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/signals/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet.trim(),
          name: name.trim(),
          bio: bio.trim(),
          priceUsdc: parseFloat(priceUsdc),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError((data as { error?: string }).error ?? 'Submission failed. Try again.');
        return;
      }

      router.push('/signals/dashboard');
    } catch {
      setSubmitError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isEligible = checkState.status === 'eligible';

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-lg mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xl font-bold font-mono hover:opacity-80 transition-opacity">
              RektReceipt
            </Link>
            <h2 className="text-[#00ff88] text-xs tracking-widest font-mono mt-1">BECOME A SIGNAL PROVIDER</h2>
          </div>
          <Link href="/" className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
            ← Home
          </Link>
        </div>

        {/* Step 1 — wallet + eligibility check */}
        <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
          <p className="text-[#6b7280] text-xs font-mono tracking-widest">STEP 1 — CHECK ELIGIBILITY</p>
          <form onSubmit={handleCheckEligibility} className="flex flex-col gap-3">
            <input
              type="text"
              value={wallet}
              onChange={(e) => {
                setWallet(e.target.value);
                setCheckState({ status: 'idle' });
                setSubmitError(null);
              }}
              placeholder="your wallet address..."
              aria-label="Wallet address"
              className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
            />
            <button
              type="submit"
              disabled={!wallet.trim() || checkState.status === 'checking'}
              className="w-full bg-[#00ff88] text-black font-bold py-2 rounded text-sm font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {checkState.status === 'checking' ? 'Checking…' : 'Check Eligibility'}
            </button>
          </form>

          {/* Error */}
          {checkState.status === 'error' && (
            <div className="border border-[#ff4444]/30 bg-[#ff4444]/5 rounded px-3 py-3">
              <p className="text-[#ff4444] text-xs font-mono">{checkState.message}</p>
            </div>
          )}

          {/* Ineligible */}
          {checkState.status === 'ineligible' && (
            <div className="border border-[#ff4444]/30 bg-[#ff4444]/5 rounded px-3 py-3 flex flex-col gap-1">
              <p className="text-[#ff4444] text-xs font-mono font-bold">Not eligible</p>
              <p className="text-[#ff4444]/80 text-xs font-mono">
                Your RektScore of {checkState.score} does not meet the 70 minimum. Keep trading and
                re-audit to improve your score.
              </p>
            </div>
          )}

          {/* Eligible badge */}
          {isEligible && (
            <div className="border border-[#00ff88]/30 bg-[#00ff88]/5 rounded px-3 py-3 flex items-center justify-between">
              <div>
                <p className="text-[#00ff88] text-xs font-mono font-bold">Eligible</p>
                <p className="text-[#00ff88]/70 text-xs font-mono">
                  RektScore {(checkState as { score: number }).score} · Grade{' '}
                  {(checkState as { grade: string }).grade}
                </p>
              </div>
              <span className="text-2xl font-bold font-mono text-[#00ff88]">✓</span>
            </div>
          )}
        </div>

        {/* Step 2 — profile form, only when eligible */}
        {isEligible && (
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
            <p className="text-[#6b7280] text-xs font-mono tracking-widest">STEP 2 — SET UP YOUR PROFILE</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[#6b7280] text-xs font-mono">
                  Display Name
                  <span className="text-[#374151] ml-2">{name.length}/40</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 40))}
                  maxLength={40}
                  required
                  placeholder="your trading handle..."
                  className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[#6b7280] text-xs font-mono">
                  Bio
                  <span className="text-[#374151] ml-2">{bio.length}/200</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 200))}
                  maxLength={200}
                  required
                  rows={3}
                  placeholder="what's your edge? describe your strategy..."
                  className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748] resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[#6b7280] text-xs font-mono">
                  Monthly Price (USDC)
                  <span className="text-[#374151] ml-2">min $5 · max $100</span>
                </label>
                <input
                  type="number"
                  value={priceUsdc}
                  onChange={(e) => setPriceUsdc(e.target.value)}
                  min={5}
                  max={100}
                  step={1}
                  required
                  placeholder="25"
                  className="w-full bg-[#0a0a0a] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
                />
              </div>

              {submitError && (
                <p className="text-[#ff4444] text-xs font-mono">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !name.trim() || !bio.trim() || !priceUsdc}
                className="w-full bg-[#00ff88] text-black font-bold py-2 rounded text-sm font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting…' : 'Apply as Signal Provider'}
              </button>
            </form>

            <p className="text-[#374151] text-[11px] font-mono leading-relaxed border-t border-[#1f2937] pt-3">
              Your on-chain track record is publicly visible to all subscribers. Your RektScore is
              re-evaluated on each audit.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
