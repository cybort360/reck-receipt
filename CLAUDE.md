# Leakage Ledger

Tool that audits a Solana wallet's execution quality — surfacing slippage loss, priority fees, and Jito tips paid.

## Stack
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Helius API for transaction data

## Key decisions
- Jito tip accounts are hardcoded (8 known addresses)
- Price data comes from Birdeye historical OHLCV (minute-level, not slot-level — acceptable for MVP)
- No auth, wallet address is the only input

## Env vars needed
- HELIUS_API_KEY
- BIRDEYE_API_KEY