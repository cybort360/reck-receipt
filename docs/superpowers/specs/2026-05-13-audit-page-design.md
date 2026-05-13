# Audit Page Design

**Date:** 2026-05-13
**Status:** Approved

## Goal

Build `app/page.tsx` as the Leakage Ledger home page. Users enter a Solana wallet address, submit, and see a receipt-style summary of their swap execution quality (fees, Jito tips, total leakage in USD).

## Layout

Two-column, side-by-side on desktop, stacked on mobile.

- **Outer:** `min-h-screen bg-[#0a0a0a]` — full dark background
- **Inner:** `max-w-3xl mx-auto px-6 py-16` — centered, comfortable padding
- **Columns:** equal width, `gap-8`, flex row on `md:` breakpoint, column on mobile

## Left Column — Input

- Title: "Leakage Ledger" in white, large, mono font
- Subtitle: "Solana execution quality audit" in muted gray
- Wallet address `<input>` — full width, dark background (`bg-[#1a1a1a]`), subtle border (`border-[#2a2a2a]`), monospace font, placeholder "wallet address..."
- "Audit" `<button>` — full width, Solana green (`bg-[#14f195]`), black text, bold. Disabled + shows "Auditing…" while loading.
- Inline error message below the button when fetch fails (red text, small)

## Right Column — Receipt Card

Hidden (`invisible` / not rendered) until a result is available or loading.

### Loading state
Skeleton rows: 4–5 pulsing gray bars (`animate-pulse`) in place of the receipt line items.

### Result state
Receipt card with:
- `border border-dashed border-[#2a2a2a]` border, `rounded-lg`, `bg-[#111]`
- Header: `RECEIPT` label in Solana green (`text-[#14f195]`), small caps / tracked
- Line items (label left, value right, `border-b border-[#1a1a1a]` separator):
  - **Wallet** — truncated: first 4 chars + `...` + last 4 chars (e.g. `GpF3...k9aX`)
  - **Swaps analyzed** — `transactionCount` as integer
  - **Total fees** — `totalFeesSol` formatted to 4 decimal places + ` SOL`
  - **Jito tips** — `totalJitoTips` as integer
- Bottom total (no separator, slightly larger):
  - Label: `TOTAL LEAKAGE` in muted gray
  - Value: `totalLeakageUsd` formatted as `$X.XX` in red (`text-red-400`), bold

## State

Three `useState` vars in the client component:

| Var | Type | Purpose |
|-----|------|---------|
| `address` | `string` | Controlled input value |
| `loading` | `boolean` | Fetch in-flight |
| `result` | `AuditResult \| null` | API response or null |
| `error` | `string \| null` | Error message or null |

`AuditResult` mirrors the API response shape:
```ts
interface AuditResult {
  wallet: string;
  totalFeesSol: number;
  totalJitoTips: number;
  totalLeakageSol: number;
  totalLeakageUsd: number;
  transactionCount: number;
}
```

## Data Flow

1. User types address → `setAddress`
2. User clicks Audit → `handleSubmit`:
   - Set `loading = true`, `error = null`
   - `fetch('/api/audit?wallet=' + address)`
   - On success: `setResult(data)`, `setLoading(false)`
   - On non-ok or network error: `setError('Failed to fetch. Check the wallet address.')`, `setLoading(false)`
3. Right column renders skeleton while `loading`, receipt when `result` is set

## Component Structure

Single `"use client"` `app/page.tsx`. No sub-components — the page is small enough that splitting adds indirection without benefit.

## Files

| File | Action |
|------|--------|
| `app/page.tsx` | Replace default scaffold with this page |

## Out of Scope

- Pagination / fetching more than 100 swaps
- Wallet validation (let the API return a 400)
- Persisting results across sessions
