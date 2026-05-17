# Rekt Wrapped — Design Spec

**Date:** 2026-05-17
**Status:** Approved

## Overview

Rekt Wrapped is a Spotify Wrapped-style monthly recap for Solana traders. At the start of each month, every Pro wallet gets a cinematic full-viewport slide deck summarising their previous month's trading behaviour — fees burned, grade, worst trade, dead bags, personality, and community rank. The Wrapped page is publicly viewable so non-Pro users can see a friend's recap and subscribe.

## Goals

- **Acquisition:** Publicly shareable URLs drive CT posts and new signups
- **Retention:** Pro users have a recurring reason to return on the 1st of each month

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Format | Full-viewport story slides | Most dramatic, best for screenshotting and sharing |
| Visual style | Cinematic | Dark red gradient, white headline glow, divider line — matches existing site |
| Desktop layout | Full viewport (100dvh) | Number fills the whole screen, max impact |
| Generation | End-of-month cron | Feels like Spotify Wrapped — it's *ready* when you wake up on the 1st |
| Data scope | Exact calendar month | True monthly story, not a rolling 30-day window |
| Viewing | Public | Non-Pro users can view a shared Wrapped; only Pro users get one generated |
| Architecture | Extend existing audit pipeline | Reuses proven code, no new data infrastructure |

## Slides (9 total, in order)

1. **Intro** — "REKTRECEIPT / MAY 2026 / VJSD…SY1 / time to face the music"
2. **Total Fees Burned** — count-up animation from $0 to final amount, cubic ease-out
3. **Grade Reveal** — large letter grade slams in with scale overshoot
4. **Worst Trade** — token symbol, fee amount, date/time of most expensive single swap
5. **Dead Bags** — count of tokens bought and never sold, token symbol chips
6. **Trader Personality** — personality type + one-line description
7. **Community Percentile** — "TOP X%" ranking vs all audited wallets
8. **Swap Count** — total swaps with a roast line ("touch grass.")
9. **Share Card** — headline, share button (copies URL to clipboard), wallet URL

## Architecture

### `lib/helius.ts` — new export

```
fetchSwapTransactionsByMonth(wallet: string, year: number, month: number): Promise<SwapTransaction[]>
```

- Same pagination loop as `fetchSwapTransactions` but stops when `tx.timestamp < monthStart` (UTC)
- Filters the collected page to `tx.timestamp >= monthStart && tx.timestamp < monthEnd` before returning
- No hard cap on tx count — fetches the full calendar month regardless of volume

### `lib/pro.ts` — pro-wallets index

`grantPro()` and `grantSignalsAccess()` add the wallet to a Redis set `KEYS.proWallets()` (`rr:v1:idx:pro-wallets`). `revokeProAccess()` removes it. This gives the cron an O(1) way to enumerate all active Pro wallets without scanning per-key.

### `lib/wrapped.ts` — new file

```
generateWrapped(wallet: string, year: number, month: number): Promise<WrappedData>
```

- Calls `fetchSwapTransactionsByMonth(wallet, year, month)` for calendar-scoped data
- Runs `calculateLeakage`, `calculateTokenBreakdown`, `getDeadTokens`, `computeRektScore`, `getTraderPersonality` — same functions used by `auditWallet`
- Computes `communityPercentile`: reads `KEYS.lbGlobal()` sorted set, counts wallets with lower leakage than this wallet's `totalLeakageUsd`, divides by total — returns `null` if fewer than 3 peers
- Stores result at `wrapped:[wallet]:[YYYY-MM]` with no TTL (permanent historical record)
- Also writes `wrapped:latest:[wallet]` → `[YYYY-MM]` for easy latest-month lookup

### Redis keys (additions to `lib/redis/keys.ts`)

```
wrapped: (wallet, yyyyMm) => `rr:v1:wrapped:${wallet}:${yyyyMm}`
wrappedLatest: (wallet) => `rr:v1:wrapped:latest:${wallet}`
```

### `app/api/cron/generate-wrapped/route.ts` — new file

- Auth: `x-admin-secret` header (same pattern as existing cron routes)
- Reads all Pro wallet addresses from `KEYS.proWallets()` Redis set (maintained by `grantPro`/`revokeProAccess`)
- For each wallet: calls `generateWrapped(wallet, prevYear, prevMonth)`
- After generation: sends Telegram DM via existing `telegram.ts` bot:
  *"🎁 Your Rekt Wrapped for [Month YYYY] is live → rektreceipt.xyz/wrapped/[wallet]/[YYYY-MM]"*
- Errors per wallet are caught and logged — one failure doesn't abort the batch

### `vercel.json` — cron addition

```json
{ "path": "/api/cron/generate-wrapped", "schedule": "0 0 1 * *" }
```

### `app/wrapped/[wallet]/[month]/page.tsx` — new server component

- Reads `wrapped:[wallet]:[YYYY-MM]` from Redis
- If not found: renders "Wrapped not generated" page with upgrade CTA
- Passes `WrappedData` to `WrappedClient`

### `app/wrapped/[wallet]/page.tsx` — redirect

- Reads `wrapped:latest:[wallet]` from Redis
- Redirects to `/wrapped/[wallet]/[YYYY-MM]`
- If no Wrapped exists: shows upgrade CTA

### `app/wrapped/[wallet]/[month]/WrappedClient.tsx` — new client component

Full-viewport slide experience:

**Navigation:**
- Left/right tap zones cover 45% of viewport width each (mobile)
- Arrow button overlays on left/right edges (desktop, hidden on mobile via CSS)
- `ArrowLeft` / `ArrowRight` / `Space` keyboard shortcuts

**Slide transitions:**
- `opacity` + `scale(0.96→1)`, 400ms ease — same pattern as `TimelineClient`
- Each slide is `position: absolute; inset: 0` inside a `position: relative` container

**Animations:**
- Fees slide: count-up from $0 using `requestAnimationFrame` + cubic ease-out `1 - (1-t)^3` over 1200ms — identical to `RektScoreCard` pattern
- Grade slide: `scale(1.3→1)` overshoot on entry, 300ms
- All other slides: fade + scale on entry (same base transition)

**Progress bar:** segmented, one segment per slide, white fill, `animation: fillBar` on active segment

**Share:** `navigator.clipboard.writeText(url)` with "Copied!" state, 2s timeout — same pattern as timeline share button

**Responsive:** `height: 100dvh` on the container. Arrow buttons `hidden md:flex`. Tap zones always present.

## Data Shape

```typescript
interface WrappedData {
  wallet: string;
  year: number;
  month: number;           // 1-12
  totalFeesUsd: number;
  totalJitoTipsUsd: number;
  grade: string;           // A-F
  rektScore: number;
  swapCount: number;
  worstTrade: {
    symbol: string;
    mint: string;
    feeUsd: number;
    timestamp: number;
  } | null;
  deadTokens: Array<{ mint: string; symbol: string }>;
  personality: {
    type: string;
    description: string;
  };
  communityPercentile: number | null;  // 0-100, null if < 3 peers
  generatedAt: number;
}
```

## Files to Create / Modify

- `lib/helius.ts` — add `fetchSwapTransactionsByMonth`
- `lib/pro.ts` — add `proWallets` set writes to `grantPro`, `grantSignalsAccess`, `revokeProAccess`
- `lib/wrapped.ts` — new file
- `lib/redis/keys.ts` — add `wrapped`, `wrappedLatest`, `proWallets` keys
- `app/api/cron/generate-wrapped/route.ts` — new file
- `app/wrapped/[wallet]/page.tsx` — new file (redirect to latest)
- `app/wrapped/[wallet]/[month]/page.tsx` — new file (server component)
- `app/wrapped/[wallet]/[month]/WrappedClient.tsx` — new file (client component)
- `vercel.json` — add cron entry

## Out of Scope

- Downloadable PNG share card (future enhancement)
- Annual "Year in Review" Wrapped (future)
- Wrapped for non-Pro / free tier wallets
