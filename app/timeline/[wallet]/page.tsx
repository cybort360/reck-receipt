import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import { getSolPriceAtTimestamp } from '@/lib/price';
import Link from 'next/link';
import { TimelineClient } from './TimelineClient';
import type { TimelineEntry, DeadTokenEntry } from './TimelineClient';

interface CachedLeg {
  mint: string;
  direction: 'buy' | 'sell';
  solAmount: number;
  tokenAmount: number;
  timestamp: number;
}

interface CachedTx {
  signature: string;
  timestamp: number;
  fee: number;
  jitoTipLamports: number;
  hasJitoTip: boolean;
  slippagePct?: number;
  likelySandwiched?: boolean;
  legs: CachedLeg[];
}

interface CachedAudit {
  wallet: string;
  totalLeakageUsd: number;
  transactionCount: number;
  tokenBreakdown: Array<{ mint: string; symbol: string; totalFeesUsd: number; swapCount: number }>;
  deadTokens?: DeadTokenEntry[];
  txs: CachedTx[];
}

interface RektScoreData {
  score: number;
  grade: string;
}

function solDateKey(tsSeconds: number): string {
  const d = new Date(tsSeconds * 1000);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function gradeFromUsd(usd: number): string {
  if (usd < 1) return 'A';
  if (usd < 5) return 'B';
  if (usd < 20) return 'C';
  if (usd < 50) return 'D';
  return 'F';
}

export default async function TimelinePage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;

  const [rawAudit, rawScore] = await Promise.all([
    redis.get<string | CachedAudit>(KEYS.audit(wallet)),
    redis.get<string | RektScoreData>(KEYS.rektScore(wallet)),
  ]);

  if (!rawAudit) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 p-4 font-mono">
        <p className="text-[#6b7280] text-sm">No cached audit found for this wallet.</p>
        <p className="text-[#374151] text-xs">Audits expire after 4 hours.</p>
        <Link
          href={`/?wallet=${wallet}`}
          className="text-[#00ff88] text-sm hover:underline transition-colors"
        >
          Run the audit first →
        </Link>
      </main>
    );
  }

  const audit: CachedAudit =
    typeof rawAudit === 'string' ? JSON.parse(rawAudit) : rawAudit;
  const score: RektScoreData | null = rawScore
    ? typeof rawScore === 'string'
      ? JSON.parse(rawScore)
      : rawScore
    : null;

  // Fetch SOL prices for all unique dates in the cached txs.
  // getSolPriceAtTimestamp caches by date in Redis so these are fast reads
  // for dates already fetched during the original audit run.
  const dateToTs = new Map<string, number>();
  for (const tx of audit.txs) {
    const key = solDateKey(tx.timestamp);
    if (!dateToTs.has(key)) dateToTs.set(key, tx.timestamp * 1000);
  }
  const solPriceByDate = new Map<string, number>();
  await Promise.all(
    [...dateToTs.entries()].map(async ([dateKey, tsMs]) => {
      const price = await getSolPriceAtTimestamp(tsMs);
      solPriceByDate.set(dateKey, price);
    }),
  );

  // Build lookup maps from the aggregate data that IS cached.
  const symbolMap = new Map(audit.tokenBreakdown.map((t) => [t.mint, t.symbol]));
  const deadMints = new Set((audit.deadTokens ?? []).map((t) => t.mint));

  // Build timeline entries — oldest first, one entry per transaction.
  // We use the primary leg (index 0) for direction/mint/amount.
  // Token→token swaps have solAmount=0 so amountUsd will be 0; that's honest.
  const sortedTxs = [...audit.txs]
    .filter((tx) => tx.legs.length > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  let cumulative = 0;
  const entries: TimelineEntry[] = sortedTxs.map((tx) => {
    const leg = tx.legs[0];
    const solPrice = solPriceByDate.get(solDateKey(tx.timestamp)) ?? 150;
    const feeUsd = ((tx.fee + tx.jitoTipLamports) / 1e9) * solPrice;
    const amountUsd = leg.solAmount > 0 ? (leg.solAmount / 1e9) * solPrice : 0;
    cumulative += feeUsd;

    return {
      signature: tx.signature,
      timestamp: tx.timestamp,
      direction: leg.direction,
      mint: leg.mint,
      symbol: symbolMap.get(leg.mint) ?? `${leg.mint.slice(0, 4)}…`,
      amountUsd,
      feeUsd,
      slippagePct: tx.slippagePct ?? 0,
      isDeadToken: deadMints.has(leg.mint),
      isHighSlippage: (tx.slippagePct ?? 0) > 5,
      isMostExpensive: false,
      cumulativeLeakageUsd: cumulative,
    };
  });

  // Mark the single most expensive swap by fee cost.
  if (entries.length > 0) {
    const maxIdx = entries.reduce(
      (best, e, i) => (e.feeUsd > entries[best].feeUsd ? i : best),
      0,
    );
    entries[maxIdx] = { ...entries[maxIdx], isMostExpensive: true };
  }

  const displayGrade = score?.grade ?? gradeFromUsd(audit.totalLeakageUsd);
  const displayScore = score?.score ?? null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      {/* ── Header ── */}
      <div className="border-b border-[#1f2937] bg-[#0a0a0a] px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/?wallet=${wallet}`}
            className="text-[#6b7280] hover:text-[#9ca3af] text-xs transition-colors"
          >
            ← back to audit
          </Link>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-[#00ff88] text-[10px] tracking-widest mb-1">DEGEN TIME MACHINE</p>
              <p className="text-white text-sm font-bold">
                {wallet.slice(0, 4)}…{wallet.slice(-4)}
              </p>
              <p className="text-[#6b7280] text-[10px] mt-0.5">
                {entries.length} swap{entries.length !== 1 ? 's' : ''} · {audit.transactionCount} total analyzed
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[#ff4444] text-base font-bold">
                ${audit.totalLeakageUsd.toFixed(2)}
              </p>
              <p className="text-[#6b7280] text-[10px]">total rekt</p>
              {displayScore !== null && (
                <p className="text-[#9ca3af] text-[10px] mt-0.5">
                  Score {displayScore} · {displayGrade}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="border-b border-[#1f2937] bg-[#0a0a0a] px-4 py-2">
        <div className="max-w-2xl mx-auto flex items-center gap-4 text-[9px] font-mono text-[#374151]">
          <span>🔥 most expensive</span>
          <span>💀 dead token</span>
          <span>⚠️ high slippage</span>
          <span>🪦 held to zero</span>
        </div>
      </div>

      {/* ── Client: timeline + dead bags + share ── */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <TimelineClient
          entries={entries}
          deadTokens={audit.deadTokens ?? []}
          totalLeakageUsd={audit.totalLeakageUsd}
          wallet={wallet}
        />
      </div>
    </main>
  );
}
