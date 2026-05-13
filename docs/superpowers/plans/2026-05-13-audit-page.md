# Audit Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the default Next.js scaffold at `app/page.tsx` with the Leakage Ledger audit page — a dark-themed two-column layout where users submit a Solana wallet address and receive a receipt-style leakage summary.

**Architecture:** Single `"use client"` component with four state vars (`address`, `loading`, `result`, `error`). Left column holds the input form; right column shows a loading skeleton or receipt card after submission. Fetches `/api/audit?wallet=…` which is already built. No sub-components — the page is small enough to keep inline.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/page.tsx` | Modify (full replace) | The audit UI |

---

## Task 1: Implement `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx` with the full implementation**

```tsx
'use client';

import { useState } from 'react';

interface AuditResult {
  wallet: string;
  totalFeesSol: number;
  totalJitoTips: number;
  totalLeakageSol: number;
  totalLeakageUsd: number;
  transactionCount: number;
}

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm font-mono">
      <span className="text-[#666]">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/audit?wallet=${encodeURIComponent(address)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Audit failed');
      }
      const data: AuditResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch. Check the wallet address.');
    } finally {
      setLoading(false);
    }
  }

  const showRight = loading || result !== null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-8">

        {/* Left column — input */}
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono">Leakage Ledger</h1>
            <p className="text-[#666] text-sm mt-1">Solana execution quality audit</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="wallet address..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444]"
            />
            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="w-full bg-[#14f195] text-black font-bold py-2 rounded hover:bg-[#10d980] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Auditing…' : 'Audit'}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Right column — receipt */}
        {showRight && (
          <div className="flex-1">
            {loading ? (
              <div className="border border-dashed border-[#2a2a2a] rounded-lg bg-[#111] p-5 flex flex-col gap-3 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 bg-[#1a1a1a] rounded" />
                ))}
              </div>
            ) : result ? (
              <div className="border border-dashed border-[#2a2a2a] rounded-lg bg-[#111] p-5">
                <p className="text-[#14f195] text-xs tracking-widest font-mono mb-4">RECEIPT</p>
                <div className="flex flex-col divide-y divide-[#1a1a1a]">
                  <Row label="Wallet" value={truncateWallet(result.wallet)} />
                  <Row label="Swaps analyzed" value={String(result.transactionCount)} />
                  <Row label="Total fees" value={`${result.totalFeesSol.toFixed(4)} SOL`} />
                  <Row label="Jito tips" value={String(result.totalJitoTips)} />
                </div>
                <div className="flex justify-between items-baseline mt-4 pt-4">
                  <span className="text-[#666] text-xs tracking-widest font-mono">TOTAL LEAKAGE</span>
                  <span className="text-red-400 font-bold text-lg">
                    ${result.totalLeakageUsd.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: build completes successfully. The `/` route will show as `(Dynamic)` because it's a client component that uses `useState`.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add audit home page with receipt card"
```

---

## Verification

Start the dev server and test end-to-end:

```bash
npm run dev
```

Open **http://localhost:3000** and verify:

1. **Empty state** — Page loads with dark background, title "Leakage Ledger", wallet input, and disabled Audit button.
2. **Button enables** — Typing any character into the input enables the Audit button.
3. **Loading state** — Clicking Audit shows "Auditing…" on the button and a pulsing skeleton on the right.
4. **Receipt** — After the API responds, the right column shows the RECEIPT card with wallet (truncated), swaps, fees in SOL, Jito tips, and TOTAL LEAKAGE in red.
5. **Error state** — Submit an empty or invalid address (e.g. `abc`) and verify an error message appears below the button.
6. **Mobile** — Resize to <768px and confirm the columns stack vertically.

> Note: You need `HELIUS_API_KEY` set in `.env.local` to get real results. With a placeholder key, the API will return a 400 or Helius error, which the UI will display as an error message — that's the correct behavior.
