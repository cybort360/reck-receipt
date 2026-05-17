'use client';

import { useEffect, useRef, useState } from 'react';

export interface TimelineEntry {
  signature: string;
  timestamp: number;
  direction: 'buy' | 'sell';
  mint: string;
  symbol: string;
  amountUsd: number;
  feeUsd: number;
  slippagePct: number;
  isDeadToken: boolean;
  isHighSlippage: boolean;
  isMostExpensive: boolean;
  cumulativeLeakageUsd: number;
}

export interface DeadTokenEntry {
  mint: string;
  symbol: string;
  balance: number;
  valueUsd: number;
}

interface Props {
  entries: TimelineEntry[];
  deadTokens: DeadTokenEntry[];
  totalLeakageUsd: number;
  wallet: string;
}

function formatTs(ts: number): { date: string; time: string } {
  const d = new Date(ts * 1000);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return { date, time };
}

function NodeDot({ entry }: { entry: TimelineEntry }) {
  if (entry.isMostExpensive)
    return <div className="w-3 h-3 rounded-full border-2 border-[#ff4444] bg-[#1a0000] flex-shrink-0 mt-0.5" />;
  if (entry.isDeadToken)
    return <div className="w-3 h-3 rounded-full border-2 border-[#ff8800] bg-[#1a0800] flex-shrink-0 mt-0.5" />;
  if (entry.isHighSlippage)
    return <div className="w-3 h-3 rounded-full border-2 border-yellow-500 bg-[#1a1600] flex-shrink-0 mt-0.5" />;
  return <div className="w-3 h-3 rounded-full border-2 border-[#1f2937] bg-[#111111] flex-shrink-0 mt-0.5" />;
}

function NodeIcons({ entry }: { entry: TimelineEntry }) {
  return (
    <span className="text-[10px] select-none">
      {entry.isMostExpensive && '🔥'}
      {entry.isDeadToken && '💀'}
      {entry.isHighSlippage && !entry.isDeadToken && '⚠️'}
    </span>
  );
}

export function TimelineClient({ entries, deadTokens, totalLeakageUsd, wallet }: Props) {
  const [displayedLeakage, setDisplayedLeakage] = useState(0);
  const [copied, setCopied] = useState(false);
  const counted = useRef(new Set<string>());
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (observations) => {
        let delta = 0;
        observations.forEach((obs) => {
          if (!obs.isIntersecting) return;
          const sig = (obs.target as HTMLElement).dataset.sig;
          const fee = parseFloat((obs.target as HTMLElement).dataset.fee ?? '0');
          if (sig && !counted.current.has(sig)) {
            counted.current.add(sig);
            delta += fee;
          }
        });
        if (delta > 0) setDisplayedLeakage((prev) => prev + delta);
      },
      { threshold: 0.15 },
    );

    nodeRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [entries]);

  const worstEntry = entries.find((e) => e.isMostExpensive);

  async function handleShare() {
    const url = `${window.location.origin}/timeline/${wallet}`;
    const text = `Watch me get rekt trade by trade. rektreceipt.xyz/timeline/${wallet}`;
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* ── Floating leakage counter ── */}
      <div className="sticky top-0 z-10 border-b border-[#1f2937] bg-[#0a0a0a]/95 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#6b7280] tracking-widest">CUMULATIVE REKT</span>
        <span className="text-sm font-bold font-mono text-[#ff4444]">
          ${displayedLeakage.toFixed(2)}
          <span className="text-[#374151] font-normal"> / ${totalLeakageUsd.toFixed(2)}</span>
        </span>
      </div>

      {/* ── Timeline ── */}
      <div className="py-6">
        {entries.length === 0 && (
          <p className="text-[#6b7280] text-xs font-mono text-center py-12">No swaps found in audit cache.</p>
        )}

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[5px] top-0 bottom-0 w-px bg-[#1f2937]" />

          <div className="flex flex-col gap-0">
            {entries.map((entry, i) => {
              const { date, time } = formatTs(entry.timestamp);
              const isWorst = entry.isMostExpensive;

              return (
                <div
                  key={entry.signature}
                  ref={(el) => { nodeRefs.current[i] = el; }}
                  data-sig={entry.signature}
                  data-fee={entry.feeUsd.toFixed(6)}
                  className="relative pl-7 pb-5 last:pb-0"
                >
                  {/* Node dot */}
                  <div className="absolute left-0 top-1">
                    <NodeDot entry={entry} />
                  </div>

                  {/* Worst swap callout */}
                  {isWorst && worstEntry && (
                    <div className="mb-2 rounded-lg border border-[#ff4444]/40 bg-[#1a0000] px-3 py-2">
                      <p className="text-[#ff4444] text-[10px] tracking-widest font-mono mb-1">THIS IS WHERE IT WENT WRONG</p>
                      <p className="text-white text-xs font-mono">
                        {worstEntry.symbol} — ${worstEntry.feeUsd.toFixed(4)} in fees
                      </p>
                      <p className="text-[#6b7280] text-[10px] font-mono">{date} · {time}</p>
                    </div>
                  )}

                  <div className="border border-[#1f2937] rounded-lg bg-[#111111] px-3 py-2.5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <NodeIcons entry={entry} />
                        <span className="text-white text-xs font-bold font-mono">{entry.symbol}</span>
                        <span className="text-[#374151] text-[9px] font-mono">
                          {entry.mint.slice(0, 4)}…{entry.mint.slice(-4)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          entry.direction === 'buy'
                            ? 'text-[#00ff88] bg-[#00ff88]/10'
                            : 'text-[#ff8800] bg-[#ff8800]/10'
                        }`}
                      >
                        {entry.direction.toUpperCase()}
                      </span>
                    </div>

                    {/* Amounts row */}
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-2 text-[#9ca3af]">
                        {entry.amountUsd > 0 && (
                          <span>${entry.amountUsd.toFixed(2)}</span>
                        )}
                        <span className="text-[#374151]">·</span>
                        <span className="text-[#ff4444]">${entry.feeUsd.toFixed(4)} fee</span>
                        {entry.slippagePct > 0 && (
                          <>
                            <span className="text-[#374151]">·</span>
                            <span className={entry.isHighSlippage ? 'text-yellow-400' : 'text-[#6b7280]'}>
                              {entry.slippagePct.toFixed(1)}% slip
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-[#6b7280]">{time}</span>
                    </div>

                    {/* Cumulative row */}
                    <div className="mt-1.5 pt-1.5 border-t border-[#1f2937] flex items-center justify-between text-[9px] font-mono">
                      <span className="text-[#374151]">{date}</span>
                      <span className="text-[#6b7280]">
                        running total{' '}
                        <span className="text-[#ff4444] font-bold">
                          ${entry.cumulativeLeakageUsd.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Dead Bags ── */}
      {deadTokens.length > 0 && (
        <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 mb-4">
          <p className="text-[#00ff88] text-xs tracking-widest font-mono mb-1">DEAD BAGS</p>
          <p className="text-[#6b7280] text-[10px] font-mono mb-3">
            {deadTokens.length} token{deadTokens.length !== 1 ? 's' : ''} bought and never fully sold —
            total current value{' '}
            <span className="text-[#ff4444]">
              ${deadTokens.reduce((s, t) => s + t.valueUsd, 0).toFixed(4)}
            </span>
          </p>
          <div className="flex flex-col divide-y divide-[#1f2937]">
            {deadTokens.map((t) => (
              <div key={t.mint} className="flex items-center justify-between py-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">🪦</span>
                  <div>
                    <span className="text-white">{t.symbol}</span>
                    <span className="text-[#374151] ml-2">
                      {t.mint.slice(0, 4)}…{t.mint.slice(-4)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#ff4444]">${t.valueUsd.toFixed(4)}</div>
                  <div className="text-[#374151] text-[9px]">{t.balance.toFixed(2)} held</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Share ── */}
      <button
        onClick={handleShare}
        className="w-full border border-[#1f2937] hover:border-[#2d3748] text-[#9ca3af] hover:text-white py-2.5 rounded text-xs font-mono transition-colors"
      >
        {copied ? 'Copied!' : 'Share this timeline →'}
      </button>
    </>
  );
}
