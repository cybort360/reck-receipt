'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SectionErrorBoundary from '@/components/SectionErrorBoundary';
import type { LeakageSummary } from '@/lib/fees';

interface TokenBreakdownEntry {
  symbol: string;
  mint: string;
  totalFeesUsd: number;
  swapCount: number;
}

interface PnlResult {
  totalRealizedPnlUsd: number;
  totalGrossValueUsd: number;
  totalNetValueUsd: number;
}

interface Personality {
  title: string;
  description: string;
  emoji: string;
}

interface Projection {
  dailyLeakageUsd: number;
  weeklyLeakageUsd: number;
  monthlyLeakageUsd: number;
  yearlyLeakageUsd: number;
  jupiterSavingsUsd: number;
}

interface DeadToken {
  mint: string;
  symbol: string;
  balance: number;
  valueUsd: number;
}

interface AuditResult extends LeakageSummary {
  wallet: string;
  shareId: string;
  tokenBreakdown: TokenBreakdownEntry[];
  peerAvgLeakageUsd: number | null;
  peerPercentile: number | null;
  pnl: PnlResult;
  personality: Personality;
  projection: Projection;
  deadTokens?: DeadToken[];
  overtrading?: {
    overtradedTokens: Array<{ symbol: string; mint: string; swapCount: number; feesUsd: number }>;
    totalOvertradingFeesUsd: number;
    overtradingSwapCount: number;
  };
  addressPoisoning?: {
    suspiciousAddresses: Array<{ address: string; matchedAddress: string; similarity: string }>;
    count: number;
  };
}

interface WeeklyStats {
  topLeakageUsd: number;
  topGrade?: string;
  topMaskedWallet?: string;
  shareId?: string;
}

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-xs sm:text-sm font-mono">
      <span className="text-[#6b7280]">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function getGrade(usd: number): { grade: string; color: string } {
  if (usd < 1) return { grade: 'A', color: 'text-[#00ff88]' };
  if (usd < 5) return { grade: 'B', color: 'text-[#00ff88]' };
  if (usd < 20) return { grade: 'C', color: 'text-yellow-400' };
  if (usd < 50) return { grade: 'D', color: 'text-[#ff4444]' };
  return { grade: 'F', color: 'text-[#ff4444]' };
}

function getGradeBorderColor(usd: number): string {
  if (usd < 20) return 'border-[#00ff88]/30';
  if (usd < 50) return 'border-yellow-400/30';
  return 'border-[#ff4444]/30';
}

function Accordion({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#1f2937] rounded-lg bg-[#111111] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-[#00ff88] tracking-widest hover:bg-[#161f2e] transition-colors"
      >
        <span>{label}</span>
        <span className="text-[#6b7280] text-base leading-none">{open ? '▴' : '▾'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

const EXPLORE_LINKS = [
  { label: 'Rektboard', href: '/rektboard' },
  { label: 'Graveyard', href: '/graveyard' },
  { label: 'Alpha Feed', href: '/alpha' },
  { label: 'Best Traders', href: '/bestboard' },
  { label: 'Compare', href: '/compare' },
];

function ExploreDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="nav-link text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors"
      >
        Explore
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 border border-[#1f2937] rounded-lg bg-[#111111] overflow-hidden z-50 shadow-xl">
          {EXPLORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="nav-link block px-4 py-2.5 text-xs font-mono text-[#9ca3af] hover:text-white hover:bg-[#161f2e] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<WeeklyStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data: WeeklyStats) => setStats({ ...data, topLeakageUsd: parseFloat(String(data.topLeakageUsd)) }))
      .catch(() => null);
  }, []);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      document.cookie = `rektreceipt-ref=${encodeURIComponent(ref)}; path=/; max-age=2592000`;
      fetch('/api/referral/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ref }),
      }).catch(() => null);
    }
  }, []);

  async function handleShare() {
    if (!result) return;
    const grade = getGrade(result.totalLeakageUsd).grade;
    const tweet = `I got a ${grade} on RektReceipt. I've leaked $${result.totalLeakageUsd.toFixed(2)} across ${result.transactionCount} swaps. Check yours: https://rektreceipt.xyz/share/${result.shareId} #RektReceipt`;
    await navigator.clipboard.writeText(tweet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function runAudit(wallet: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/audit?wallet=${encodeURIComponent(wallet)}`);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runAudit(address);
  }

  function handleDemo() {
    const demo = '62qEWURTpb8RNqoPCrjaoRcfU4PneigVKbiuGtin2Wb4';
    setAddress(demo);
    runAudit(demo);
  }

  const showRight = loading || result !== null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-5xl mx-auto">
        <div className={`grid gap-6 lg:gap-8 ${showRight ? 'lg:grid-cols-2' : ''}`}>

          {/* Left column — input */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono">RektReceipt</h1>
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="nav-link text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
                  Dashboard
                </Link>
                <ExploreDropdown />
              </div>
            </div>
            <p className="text-[#6b7280] text-sm">Find out how much Solana has taken from you.</p>
            {stats && stats.topLeakageUsd > 0 && stats.shareId && (
              <Link
                href={`/share/${stats.shareId}`}
                className="flex items-center gap-2 bg-[#111111] border border-[#1f2937] rounded px-3 py-2 text-xs font-mono hover:border-[#2d3748] transition-colors"
              >
                <span className="text-[#6b7280]">This week&apos;s most rekt wallet lost</span>
                <span className="text-[#ff4444] font-bold">${stats.topLeakageUsd.toFixed(2)}</span>
                {stats.topGrade && (
                  <span className={`font-bold ml-auto ${getGrade(stats.topLeakageUsd).color}`}>
                    {stats.topGrade}
                  </span>
                )}
              </Link>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="wallet address..."
                  aria-label="Wallet address"
                  className="w-full bg-[#111111] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
                />
                {!address && !result && (
                  <button
                    type="button"
                    onClick={handleDemo}
                    className="self-start text-[#6b7280] hover:text-[#9ca3af] text-xs font-mono transition-colors"
                  >
                    try a demo wallet →
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !address.trim()}
                className="w-full bg-[#00ff88] text-black font-bold py-2 rounded hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Auditing…' : 'Audit'}
              </button>
            </form>

            {/* Feature cards — only when no result */}
            {!result && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'RUG RADAR', desc: 'Check any token before you ape', href: '/token' },
                  { label: 'ALPHA FEED', desc: 'See what A-grade wallets are trading', href: '/alpha' },
                  { label: 'GRAVEYARD', desc: 'Tokens that rugged the most wallets', href: '/graveyard' },
                ].map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="border border-[#1f2937] hover:border-[#2d3748] rounded-lg bg-[#111111] hover:bg-[#161f2e] p-3 flex flex-col gap-1.5 transition-colors group"
                  >
                    <span className="text-[#6b7280] text-[10px] font-mono tracking-widest group-hover:text-[#9ca3af] transition-colors">
                      {card.label}
                    </span>
                    <span className="text-[#374151] text-[11px] font-mono leading-snug group-hover:text-[#6b7280] transition-colors">
                      {card.desc}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {error && <p className="text-[#ff4444] text-sm">{error}</p>}
          </div>

          {/* Right column — results */}
          {showRight && (
            <div className="flex flex-col gap-3">
              {loading ? (
                <div className="border border-dashed border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-3 animate-pulse">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-[#1f2937] rounded" />
                  ))}
                </div>
              ) : result ? (
                <>
                  {/* Verdict line */}
                  <p className="text-xs font-mono text-[#6b7280] px-1">
                    You lost{' '}
                    <span className="text-[#ff4444]">${result.totalLeakageUsd.toFixed(2)}</span>
                    {' '}to fees and avoidable costs across {result.transactionCount} swaps.
                  </p>
                  {result.addressPoisoning?.count === 0 && (
                    <p className="text-xs font-mono text-[#6b7280] px-1">No address poisoning attempts detected.</p>
                  )}

                  {/* Receipt card */}
                  <div className="border border-dashed border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5">
                    <p className="text-[#00ff88] text-xs tracking-widest font-mono mb-3 sm:mb-4">RECEIPT</p>
                    <div className="flex flex-col divide-y divide-[#1f2937]">
                      <Row label="Wallet" value={truncateWallet(result.wallet)} />
                      <Row label="Swaps analyzed" value={String(result.transactionCount)} />
                      <Row label="Total fees" value={`${result.totalFeesSol.toFixed(4)} SOL`} />
                      <Row label="Jito tips" value={`${result.totalJitoTips} txns · ${result.totalJitoTipsSol.toFixed(4)} SOL`} />
                      <div className="flex justify-between py-2 text-xs sm:text-sm font-mono">
                        <span className="text-[#6b7280]">Sandwich detection</span>
                        <span className="text-[#6b7280] italic">coming soon</span>
                      </div>
                      <div className="flex justify-between py-2 text-xs sm:text-sm font-mono">
                        <span className="text-[#6b7280]">Execution grade</span>
                        <span className={`font-bold ${getGrade(result.totalLeakageUsd).color}`}>
                          {getGrade(result.totalLeakageUsd).grade}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[#1f2937]">
                      <span className="text-[#6b7280] text-xs tracking-widest font-mono">TOTAL REKT</span>
                      <span className="text-[#ff4444] font-bold text-base sm:text-lg">
                        ${result.totalLeakageUsd.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Peer comparison */}
                  {result.peerPercentile != null && Number.isFinite(result.peerPercentile) && (
                    <p className={`text-xs font-mono px-1 ${result.peerPercentile > 50 ? 'text-[#ff4444]' : 'text-[#00ff88]'}`}>
                      You leaked more than {result.peerPercentile}% of wallets with similar trade volume.
                    </p>
                  )}

                  {/* Fee breakdown accordion */}
                  {result.tokenBreakdown.length > 0 && (
                    <SectionErrorBoundary section="Fee Breakdown">
                    <Accordion label="FEE BREAKDOWN BY TOKEN">
                      <table className="w-full text-xs font-mono mt-1">
                        <thead>
                          <tr className="text-[#6b7280] tracking-widest">
                            <th className="text-left pb-2 font-normal">TOKEN</th>
                            <th className="text-right pb-2 font-normal">SWAPS</th>
                            <th className="text-right pb-2 font-normal">FEES PAID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2937]">
                          {result.tokenBreakdown.map((entry) => (
                            <tr key={entry.mint}>
                              <td className="py-2 text-white">{entry.symbol}</td>
                              <td className="py-2 text-right text-[#6b7280]">{entry.swapCount}</td>
                              <td className="py-2 text-right text-[#ff4444]">${entry.totalFeesUsd.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Accordion>
                    </SectionErrorBoundary>
                  )}

                  {/* Dead bags accordion */}
                  {result.deadTokens && result.deadTokens.length > 0 && (
                    <SectionErrorBoundary section="Dead Bags">
                    <Accordion label="DEAD BAGS">
                      <p className="text-xs font-mono text-[#6b7280] mt-1 mb-3">
                        {result.deadTokens.length} token{result.deadTokens.length !== 1 ? 's' : ''} worth less than $1 total —{' '}
                        <span className="text-[#ff4444]">${result.deadTokens.reduce((s, t) => s + t.valueUsd, 0).toFixed(4)}</span> left
                      </p>
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="text-[#6b7280] tracking-widest">
                            <th className="text-left pb-2 font-normal">TOKEN</th>
                            <th className="text-right pb-2 font-normal">BALANCE</th>
                            <th className="text-right pb-2 font-normal">VALUE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2937]">
                          {result.deadTokens.map((t) => (
                            <tr key={t.mint}>
                              <td className="py-2 text-white">{t.symbol}</td>
                              <td className="py-2 text-right text-[#6b7280]">{t.balance.toFixed(4)}</td>
                              <td className="py-2 text-right text-[#ff4444]">${t.valueUsd.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Accordion>
                    </SectionErrorBoundary>
                  )}

                  {/* P&L accordion */}
                  {result.pnl && (
                    <Accordion label="REAL P&amp;L">
                      <p className={`text-sm font-bold font-mono mt-1 mb-3 ${result.pnl.totalNetValueUsd >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                        Your real returns after fees: {result.pnl.totalNetValueUsd >= 0 ? '+' : ''}${result.pnl.totalNetValueUsd.toFixed(2)}
                      </p>
                      <div className="flex flex-col divide-y divide-[#1f2937]">
                        <Row label="Gross value" value={`$${result.pnl.totalGrossValueUsd.toFixed(2)}`} />
                        <Row label="Total fees paid" value={`-$${result.totalLeakageUsd.toFixed(2)}`} />
                        <Row label="Net value" value={`$${result.pnl.totalNetValueUsd.toFixed(2)}`} />
                      </div>
                    </Accordion>
                  )}

                  {/* Overtrading accordion */}
                  {result.overtrading && result.overtrading.overtradedTokens.length > 0 && (
                    <SectionErrorBoundary section="Overtrading">
                    <Accordion label="OVERTRADING">
                      <p className="text-xs font-mono text-[#6b7280] mt-1 mb-3">
                        {result.overtrading.overtradingSwapCount} swaps on{' '}
                        {result.overtrading.overtradedTokens.length} token{result.overtrading.overtradedTokens.length !== 1 ? 's' : ''} you kept trading —{' '}
                        <span className="text-[#ff4444]">${result.overtrading.totalOvertradingFeesUsd.toFixed(2)}</span> in fees
                      </p>
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="text-[#6b7280] tracking-widest">
                            <th className="text-left pb-2 font-normal">TOKEN</th>
                            <th className="text-right pb-2 font-normal">SWAPS</th>
                            <th className="text-right pb-2 font-normal">FEES PAID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2937]">
                          {result.overtrading.overtradedTokens.map((t) => (
                            <tr key={t.mint}>
                              <td className="py-2 text-white">{t.symbol}</td>
                              <td className="py-2 text-right text-[#6b7280]">{t.swapCount}</td>
                              <td className="py-2 text-right text-[#ff4444]">${t.feesUsd.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Accordion>
                    </SectionErrorBoundary>
                  )}

                  {/* Address poisoning accordion */}
                  {result.addressPoisoning && result.addressPoisoning.count > 0 && (
                    <Accordion label="ADDRESS POISONING">
                      <p className="text-xs font-mono text-yellow-400 mt-1 mb-3">
                        {result.addressPoisoning.count} suspicious lookalike address{result.addressPoisoning.count !== 1 ? 'es' : ''} found in your transaction history.
                      </p>
                      <div className="flex flex-col gap-3">
                        {result.addressPoisoning.suspiciousAddresses.map((s) => (
                          <div key={s.address} className="flex flex-col gap-1 border border-[#1f2937] rounded p-3">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-[#6b7280]">Suspicious</span>
                              <span className="text-yellow-400 break-all text-right ml-4">{s.address}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-[#6b7280]">Looks like</span>
                              <span className="text-[#9ca3af] break-all text-right ml-4">{s.matchedAddress}</span>
                            </div>
                            <span className="text-[#6b7280] text-xs font-mono">{s.similarity}</span>
                          </div>
                        ))}
                      </div>
                    </Accordion>
                  )}

                  {/* Degen report card accordion */}
                  {result.personality && (
                    <SectionErrorBoundary section="Degen Report Card">
                    <Accordion label="DEGEN REPORT CARD">
                      <div className={`mt-2 rounded-lg border p-4 ${getGradeBorderColor(result.totalLeakageUsd)}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{result.personality.emoji}</span>
                          <span className="text-base font-bold font-mono text-white">{result.personality.title}</span>
                        </div>
                        <p className="text-xs font-mono text-[#9ca3af] leading-relaxed">{result.personality.description}</p>
                      </div>
                    </Accordion>
                    </SectionErrorBoundary>
                  )}

                  {/* Leakage projection accordion */}
                  {result.projection && (
                    <SectionErrorBoundary section="Leakage Projection">
                    <Accordion label="LEAKAGE PROJECTION">
                      <table className="w-full text-xs font-mono mt-2">
                        <thead>
                          <tr className="text-[#6b7280] tracking-widest">
                            <th className="text-left pb-2 font-normal">PERIOD</th>
                            <th className="text-right pb-2 font-normal">EST. LEAKAGE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2937]">
                          <tr>
                            <td className="py-2 text-[#6b7280]">Daily</td>
                            <td className="py-2 text-right text-[#ff4444]">${result.projection.dailyLeakageUsd.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-[#6b7280]">Weekly</td>
                            <td className="py-2 text-right text-[#ff4444]">${result.projection.weeklyLeakageUsd.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-[#6b7280]">Monthly</td>
                            <td className="py-2 text-right text-[#ff4444]">${result.projection.monthlyLeakageUsd.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-[#6b7280]">Yearly</td>
                            <td className="py-2 text-right text-[#ff4444]">${result.projection.yearlyLeakageUsd.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="mt-3 flex justify-between items-center rounded px-3 py-2 bg-[#0a1a0f] border border-green-900/50 text-xs font-mono">
                        <span className="text-[#6b7280]">Estimated Jupiter savings</span>
                        <span className="text-[#00ff88] font-bold">${result.projection.jupiterSavingsUsd.toFixed(2)}/year</span>
                      </div>
                      <a
                        href="https://jup.ag/?referrer=DfQgaajq6LfcLHZuqRC36GoWbH9iqw8hGGnkCXcNbRiH&feeBps=50"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 w-full text-center border border-violet-900 text-violet-400 hover:text-violet-300 hover:border-violet-700 py-2 rounded text-xs font-mono transition-colors block"
                      >
                        {(() => {
                          const grade = getGrade(result.totalLeakageUsd).grade;
                          if (grade === 'D' || grade === 'F') return 'Your execution is poor. Trade smarter on Jupiter.';
                          if (result.totalJitoTips > 0) return 'You paid MEV bots. Use Jupiter MEV protection.';
                          return 'Improve your execution on Jupiter.';
                        })()}
                      </a>
                    </Accordion>
                    </SectionErrorBoundary>
                  )}

                  {/* Actions */}
                  <button
                    onClick={handleShare}
                    className="w-full border border-[#1f2937] text-[#9ca3af] hover:text-white hover:border-[#2d3748] py-2 rounded text-sm font-mono transition-colors"
                  >
                    {copied ? 'Copied to clipboard!' : 'Share'}
                  </button>
                  <Link
                    href={`/referral?wallet=${encodeURIComponent(result.wallet)}`}
                    className="nav-link w-full text-center text-[#6b7280] text-xs font-mono transition-colors"
                  >
                    Share &amp; Earn
                  </Link>
                  <div className="flex justify-center gap-6 flex-wrap">
                    <Link
                      href={`/history/${result.wallet}`}
                      className="nav-link text-[#6b7280] text-xs font-mono transition-colors"
                    >
                      View history
                    </Link>
                    <a
                      href={`/api/export?wallet=${encodeURIComponent(result.wallet)}`}
                      download
                      className="nav-link text-[#6b7280] text-xs font-mono transition-colors"
                    >
                      Export CSV
                    </a>
                    <Link
                      href={`/watch?wallet=${encodeURIComponent(result.wallet)}`}
                      className="nav-link text-[#6b7280] text-xs font-mono transition-colors"
                    >
                      Wallet Watch
                    </Link>
                    <Link
                      href={`/compare?wallet1=${encodeURIComponent(result.wallet)}`}
                      className="nav-link text-[#6b7280] text-xs font-mono transition-colors"
                    >
                      Compare
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
