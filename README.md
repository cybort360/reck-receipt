# RektReceipt

Audit any Solana wallet and see exactly how much you have lost to fees, priority fees, and Jito tips across your last 100 swaps. Get a letter grade on your execution quality and share your results.

**Live at:** [rektreceipt.xyz](https://rektreceipt.xyz)

---

## What it does

Paste a Solana wallet address and RektReceipt will:

- Fetch your last 100 swap transactions via the Helius Enhanced Transactions API
- Sum up all transaction fees in SOL and USD
- Detect Jito tips -- transfers to any of the 8 known Jito tip accounts -- and sum their total in SOL
- Calculate total leakage as fees + Jito tips
- Give you an execution grade: A (under $1), B (under $5), C (under $20), D (under $50), F ($50+)
- Generate a tweetable receipt with your grade and total loss

---

## Stack

- [Next.js 14](https://nextjs.org) App Router
- TypeScript
- Tailwind CSS
- [Helius](https://helius.dev) -- Enhanced Transactions API
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
```

Get a free Helius API key at [helius.dev](https://helius.dev).

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
app/
  page.tsx               Home page -- wallet input and receipt card
  layout.tsx             Root layout with OG metadata
  opengraph-image.tsx    Static OG image (1200x630)
  api/audit/route.ts     GET /api/audit?wallet= -- fetch, calculate, respond

lib/
  helius.ts              fetchSwapTransactions -- last 100 SWAPs via Helius
  fees.ts                calculateLeakage -- fees, Jito tips, USD total
  price.ts               getSolPrice -- CoinGecko with $150 fallback
```

---

## API

### `GET /api/audit?wallet={address}`

Returns a leakage summary for the given Solana wallet address.

**Response**

```json
{
  "wallet": "GpF3...k9aX",
  "transactionCount": 47,
  "totalFeesSol": 0.0021,
  "totalJitoTips": 12,
  "totalJitoTipsSol": 0.0035,
  "totalLeakageSol": 0.0056,
  "totalLeakageUsd": 0.98
}
```

**Errors**

- `400` -- `{ "error": "wallet address required" }` if the query param is missing
- Helius errors are forwarded with their original status code

---

## Tests

```bash
npm test
```

9 unit tests covering Helius fetch logic, leakage calculation, and SOL price fallback behavior.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HELIUS_API_KEY` | Yes | Helius API key for transaction fetching |
| `BIRDEYE_API_KEY` | No | Reserved for future slippage analysis |

---

## License

MIT
