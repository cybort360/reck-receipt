'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EligibilityData {
  efficiencyScore: number | null;
  swapCount: number;
}

type CheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | { status: 'done'; data: EligibilityData };

type SolanaWallet = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (msg: Uint8Array, enc: string) => Promise<{ signature: Uint8Array }>;
};

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono font-bold text-sm ${ok ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
        {ok ? '✓' : '✗'}
      </span>
      <span className={`font-mono text-xs ${ok ? 'text-[#00ff88]/80' : 'text-[#ff4444]/80'}`}>
        {label}
      </span>
    </div>
  );
}

export default function ApplyPage() {
  const router = useRouter();

  const [connectedWallet, setConnectedWallet] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const [checkState, setCheckState] = useState<CheckState>({ status: 'idle' });

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [priceUsdc, setPriceUsdc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function checkEligibility(wallet: string) {
    setCheckState({ status: 'checking' });
    try {
      const res = await fetch(`/api/signals/apply?wallet=${encodeURIComponent(wallet)}`);
      if (res.status === 404) {
        setCheckState({ status: 'error', message: 'No audit found for this wallet. Run an audit first.' });
        return;
      }
      if (res.status === 429) {
        setCheckState({ status: 'error', message: 'Too many requests. Wait a moment and try again.' });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCheckState({ status: 'error', message: (data as { error?: string }).error ?? 'Failed to fetch eligibility. Try again.' });
        return;
      }
      const data: EligibilityData = await res.json();
      setCheckState({ status: 'done', data });
    } catch {
      setCheckState({ status: 'error', message: 'Network error. Check your connection and try again.' });
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
      await checkEligibility(wallet);
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
    setCheckState({ status: 'idle' });
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEligible || !sessionToken) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/signals/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({
          wallet: connectedWallet,
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

  const eligibilityData = checkState.status === 'done' ? checkState.data : null;
  const efficiencyOk =
    eligibilityData != null &&
    eligibilityData.efficiencyScore != null &&
    eligibilityData.efficiencyScore >= 65;
  const activityOk = eligibilityData != null && eligibilityData.swapCount >= 20;
  const isEligible = efficiencyOk && activityOk;
  const noEfficiencyScore = eligibilityData != null && eligibilityData.efficiencyScore == null;

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

        {/* Step 1 — sign in + eligibility */}
        <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
          <p className="text-[#6b7280] text-xs font-mono tracking-widest">STEP 1 — CHECK ELIGIBILITY</p>

          {!connectedWallet ? (
            <>
              <button
                type="button"
                onClick={() => void handleSignIn()}
                disabled={signing}
                className="w-full bg-[#00ff88] text-black font-bold py-2 rounded text-sm font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {signing ? 'Connecting…' : 'Sign in with Wallet'}
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

              {checkState.status === 'checking' && (
                <p className="text-[#6b7280] text-xs font-mono">Checking eligibility…</p>
              )}

              {checkState.status === 'error' && (
                <div className="border border-[#ff4444]/30 bg-[#ff4444]/5 rounded px-3 py-3">
                  <p className="text-[#ff4444] text-xs font-mono">{checkState.message}</p>
                </div>
              )}

              {checkState.status === 'done' && eligibilityData && (
                <div
                  className={`border rounded px-3 py-3 flex flex-col gap-2 ${
                    isEligible
                      ? 'border-[#00ff88]/30 bg-[#00ff88]/5'
                      : 'border-[#ff4444]/30 bg-[#ff4444]/5'
                  }`}
                >
                  {noEfficiencyScore ? (
                    <p className="text-[#ff4444] text-xs font-mono">
                      Re-audit your wallet to generate an updated efficiency score.
                    </p>
                  ) : (
                    <>
                      <Check
                        ok={efficiencyOk}
                        label={`Efficiency Score: ${eligibilityData.efficiencyScore}/100 (minimum 65)`}
                      />
                      <Check
                        ok={activityOk}
                        label={`Trade Activity: ${eligibilityData.swapCount} swaps (minimum 20)`}
                      />
                      {!isEligible && (
                        <p className="text-[#ff4444]/70 text-[11px] font-mono mt-1">
                          Re-audit your wallet to generate an updated efficiency score.
                        </p>
                      )}
                    </>
                  )}
                  {isEligible && (
                    <p className="text-[#00ff88] text-xs font-mono font-bold mt-1">Eligible ✓</p>
                  )}
                </div>
              )}
            </>
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
              Your on-chain track record is publicly visible to all subscribers. Your efficiency score is
              re-evaluated on each audit.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
