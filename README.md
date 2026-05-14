# RektReceipt

Audit any Solana wallet and see exactly how much you have lost to fees, priority fees, and Jito tips across your last 100 swaps. Get a letter grade on your execution quality and share your results.

**Live at:** [rektreceipt.vercel.app](https://rektreceipt.vercel.app)

---

## What it does

Paste a Solana wallet address and RektReceipt will:

- Fetch your last 100 swap transactions via the Helius Enhanced Transactions API
- Sum all transaction fees in SOL and USD
- Detect Jito tips -- transfers to any of the 8 known Jito tip accounts -- and sum their total in SOL
- Calculate total leakage as fees + Jito tips
- Give you an execution grade: A (under $1), B (under $5), C (under $20), D (under $50), F ($50+)
- Generate a shareable receipt with a unique URL and pre-written tweet
- Store your audit history so you can track improvement over time
- Show a Rektboard of the most rekt wallets in the last 7 days

---

## Stack

- [Next.js 14](https://nextjs.org) App Router
- TypeScript
- Tailwind CSS
- [Helius](https://helius.dev) -- Enhanced Transactions API
- [Upstash Redis](https://upstash.com) -- receipts, leaderboard, and audit history
- [CoinGecko](https://coingecko.com) -- SOL/USD price (falls back to $150 if unavailable)

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/cybort360/reck-receipt.git
cd reck-receipt
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```
HELIUS_API_KEY=your_helius_api_key_here
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here
```

Get a free Helius API key at [helius.dev](https://helius.dev).
Get a free Upstash Redis database at [upstash.com](https://upstash.com).

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
app/
  page.tsx                      Home page -- wallet input and receipt card
  layout.tsx                    Root layout with OG metadata
  rektboard/page.tsx            Rektboard -- top 20 most rekt wallets (all time)
  share/[id]/page.tsx           Shareable receipt page
  share/[id]/opengraph-image.tsx  Dynamic OG image per wallet
  history/[wallet]/page.tsx     Audit history for a wallet with trend indicator
  api/audit/route.ts            GET /api/audit?wallet=
  api/rektboard/route.ts        GET /api/rektboard
  api/stats/route.ts            GET /api/stats -- this week's top wallet

lib/
  helius.ts                     fetchSwapTransactions -- last 100 SWAPs via Helius
  fees.ts                       calculateLeakage -- fees, Jito tips, USD total, sandwich count
  price.ts                      getSolPrice -- CoinGecko with $150 fallback
  redis.ts                      Upstash Redis client

public/
  og.png                        Static OG image (1200x630)

scripts/
  generate-og.mjs               Generates public/og.png using canvas
```

---

## API

### `GET /api/audit?wallet={address}`

Fetches the last 100 swaps for the wallet, calculates leakage, stores the result in Redis, and returns a shareable receipt.

**Response**

```json
{
  "wallet": "GpF3...k9aX",
  "shareId": "a3x9k2",
  "transactionCount": 47,
  "totalFeesSol": 0.0021,
  "totalJitoTips": 12,
  "totalJitoTipsSol": 0.0035,
  "totalLeakageSol": 0.0056,
  "totalLeakageUsd": 0.98,
  "sandwichCount": 3
}
```

### `GET /api/rektboard`

Returns the top 20 wallets by total leakage (all time).

### `GET /api/stats`

Returns this week's most rekt wallet: `{ topLeakageUsd, topGrade, topMaskedWallet, shareId }`. Returns `{ topLeakageUsd: 0 }` if no audits this week.

---

## Redis data model

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `receipt:{shareId}` | string | 7 days | Full audit result JSON |
| `wallet:shareId:{wallet}` | string | none | Latest shareId for a wallet |
| `rektboard` | sorted set | none | All-time leaderboard, scored by USD leakage, one entry per wallet |
| `rektboard:week:{week}` | sorted set | 14 days | Weekly leaderboard, one entry per wallet |
| `history:{wallet}` | list | none | Up to 30 audit snapshots per wallet, newest first |

---

## Tests

```bash
npm test
```

Unit tests covering Helius fetch logic, leakage calculation, and SOL price fallback behavior.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HELIUS_API_KEY` | Yes | Helius API key for transaction fetching |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |

---

## License

MIT
