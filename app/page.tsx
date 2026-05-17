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
  rektScore?: RektScoreData;
  realizedPnl?: {
    totalRealizedSOL: number;
    closedPositions: number;
    winRate: number;
    avgPnlPerTrade: number;
  };
}

interface RektScoreData {
  score: number;
  grade: string;
  breakdown: {
    winRate: number;
    slippageEfficiency: number;
    disciplineScore: number;
    rugResilience: number;
    bagHealth: number;
  };
}

interface WeeklyStats {
  topLeakageUsd: number;
  topGrade?: string;
  topMaskedWallet?: string;
  shareId?: string;
  walletCount?: number;
  feesFoundUsd?: number;
  rugsDetected?: number;
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

function getRektScoreGradeColor(grade: string): string {
  if (grade === 'S' || grade === 'A') return '#00ff88';
  if (grade === 'B') return '#ffd700';
  if (grade === 'C' || grade === 'D') return '#ff8800';
  return '#ff4444';
}

function getBarColor(value: number): string {
  if (value >= 70) return '#00ff88';
  if (value >= 40) return '#ff8800';
  return '#ff4444';
}

const SCORE_BARS: { label: string; key: keyof RektScoreData['breakdown'] }[] = [
  { label: 'Win Rate', key: 'winRate' },
  { label: 'Slippage Eff.', key: 'slippageEfficiency' },
  { label: 'Discipline', key: 'disciplineScore' },
  { label: 'Rug Resilience', key: 'rugResilience' },
  { label: 'Bag Health', key: 'bagHealth' },
];

interface FlavorStats {
  totalLeakageUsd: number;
  transactionCount: number;
  totalJitoTips: number;
}

function getFlavorText(score: RektScoreData, stats: FlavorStats): string | null {
  const { breakdown, grade } = score;
  const { totalLeakageUsd, transactionCount, totalJitoTips } = stats;
  const isDOrF = grade === 'D' || grade === 'F';
  if (totalLeakageUsd > 200) return "Your fees are farming you harder than you're farming yields.";
  if (breakdown.slippageEfficiency < 50) return 'You\'re donating to liquidity providers. Generously.';
  if (transactionCount > 80 && isDOrF) return 'You traded yourself into a hole and kept digging.';
  if (breakdown.winRate < 25) return '1 in 4. The house has better odds.';
  if (totalJitoTips > 0 && grade === 'F') return 'You paid to get rekt faster.';
  if (breakdown.rugResilience === 0) return 'Zero rug resilience. Every rugpull found you.';
  if (grade === 'A') return "Clean. Don't let this go to your head.";
  if (breakdown.bagHealth === 100 && isDOrF) return 'Good bags, terrible execution. The worst combination.';
  return null;
}

const SCORE_ANIM_DURATION = 1500;

function interpolateHex(from: string, to: string, t: number): string {
  const f = parseInt(from.slice(1), 16);
  const t2 = parseInt(to.slice(1), 16);
  const r = Math.round(((f >> 16) & 0xff) + (((t2 >> 16) & 0xff) - ((f >> 16) & 0xff)) * t);
  const g = Math.round(((f >> 8) & 0xff) + (((t2 >> 8) & 0xff) - ((f >> 8) & 0xff)) * t);
  const b = Math.round((f & 0xff) + ((t2 & 0xff) - (f & 0xff)) * t);
  return `rgb(${r},${g},${b})`;
}

function getAnimatedScoreColor(val: number): string {
  if (val <= 40) return '#00ff88';
  if (val <= 70) return interpolateHex('#00ff88', '#ffd700', (val - 40) / 30);
  return interpolateHex('#ffd700', '#ff4444', (val - 70) / 30);
}

function RektScoreCard({ score, wallet, stats }: { score: RektScoreData; wallet: string; stats: FlavorStats }) {
  const [scoreCopied, setScoreCopied] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [visibleBars, setVisibleBars] = useState(0);
  const rafRef = useRef<number>(0);
  const flavorText = getFlavorText(score, stats);

  useEffect(() => {
    const target = score.score;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / SCORE_ANIM_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayScore(target);
        SCORE_BARS.forEach((_, i) => {
          setTimeout(() => setVisibleBars(i + 1), i * 150);
        });
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score.score]);

  const animatedColor = getAnimatedScoreColor(displayScore);

  async function handleShareScore() {
    await navigator.clipboard.writeText(`https://rektreceipt.xyz/score/${wallet}`);
    setScoreCopied(true);
    setTimeout(() => setScoreCopied(false), 2000);
  }

  return (
    <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4">
      <p className="text-[#00ff88] text-xs tracking-widest font-mono mb-3">REKT SCORE</p>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-5xl font-bold font-mono leading-none" style={{ color: animatedColor }}>
          {displayScore}
        </span>
        <span className="text-3xl font-bold font-mono leading-none" style={{ color: animatedColor }}>
          {score.grade}
        </span>
        <span className="text-xs font-mono text-[#6b7280] ml-auto self-end">/ 100</span>
      </div>
      {flavorText && (
        <p className="text-[#9ca3af] text-xs font-mono font-bold mb-3 leading-snug">{flavorText}</p>
      )}
      <div className="flex flex-col gap-2.5">
        {SCORE_BARS.map(({ label, key }, i) => {
          const value = score.breakdown[key];
          const visible = i < visibleBars;
          return (
            <div
              key={key}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(4px)',
                transition: 'opacity 300ms ease, transform 300ms ease',
              }}
            >
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-mono text-[#6b7280] tracking-wider">{label}</span>
                <span className="text-[10px] font-mono text-[#9ca3af]">{value}</span>
              </div>
              <div className="h-0.5 bg-[#1f2937] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: visible ? `${value}%` : '0%',
                    backgroundColor: getBarColor(value),
                    opacity: 0.65,
                    transition: 'width 400ms ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={handleShareScore}
        className="mt-4 w-full border border-[#1f2937] text-[#9ca3af] hover:text-white hover:border-[#2d3748] py-1.5 rounded text-xs font-mono transition-colors"
      >
        {scoreCopied ? 'Copied!' : 'Share Score'}
      </button>
    </div>
  );
}

// ─── Grief Counselor ────────────────────────────────────────────────────────

type VoiceKey = 'father' | 'wallstreet' | 'monk';

interface VoiceDef {
  key: VoiceKey;
  emoji: string;
  label: string;
  tagline: string;
  openers: string[];
  mids: string[];
  closers: string[];
}

const VOICES: VoiceDef[] = [
  {
    key: 'father',
    emoji: '😔',
    label: 'Disappointed Father',
    tagline: 'Quiet devastation',
    openers: [
      "I sat down with your trading history. I haven't stood back up.",
      'Your mother wanted me to go easy on you. Then I looked at this again.',
      "We didn't raise you to buy {t1}. And yet.",
      '${total} in fees. I paid less than that for your first car.',
      "I've reviewed the numbers twice. I'm going to need a minute.",
      "You know what I was doing at your age? Not this.",
    ],
    mids: [
      '{t1}. You bought {t1}. You did it {s1} times. Each time, a choice.',
      '${l1} on {t1}. I don\'t need to say anything else. I just need you to sit with that.',
      'The {t1} fees alone were ${l1}. That\'s a month of groceries. That\'s my car payment.',
      'You went back to {t2} {s2} times. That\'s not trading, that\'s grief.',
      '${l2} on {t2}. I asked your uncle not to look at this.',
      'Your grandfather never bought {t2}. He died with his money.',
      'I told your mother about {t1}. She said nothing. That was worse.',
      '{s1} swaps on {t1}. Each one another chance to stop. You kept going.',
    ],
    closers: [
      "I'm not angry. I want to be very clear: I am just deeply tired.",
      "Call your mother. Don't mention the {t1}.",
      'Your sister put everything in index funds. It\'s earning 4.8 percent.',
      "I love you. That's the only reason I'm still sitting here.",
      "I've left your dinner on the stove. We don't need to talk about this tonight.",
      "Take some time. Think about what you want. It's clearly not profit.",
    ],
  },
  {
    key: 'wallstreet',
    emoji: '📊',
    label: 'Wall Street Bro',
    tagline: 'Loud and personal',
    openers: [
      "BRO. I READ THIS THREE TIMES. THREE TIMES. I'M STILL PROCESSING.",
      "I showed my analyst this audit. He went home early. BECAUSE OF YOU.",
      "I've seen bad traders. I have literally NEVER seen this specific level of bad.",
      '${total} IN FEES. That\'s not a portfolio, that\'s a CHARITY.',
      'My risk manager asked me to stop forwarding him audits. I\'m forwarding this one anyway.',
      "Bro I'm on my fourth espresso and this audit just broke me.",
    ],
    mids: [
      '{t1}?? {s1} TIMES?? AT ${l1} IN FEES?? EXPLAIN YOURSELF.',
      '${l1} on {t1}. That\'s not slippage. That\'s SURRENDER.',
      'You averaged down on {t1}. You AVERAGED DOWN. I need to lie down.',
      '{t2} again. AGAIN. ${l2}. {s2} swaps. I don\'t have the words.',
      "The {t2} position would have gotten you fired at any firm I've worked at. I've worked at SEVERAL.",
      '${l2} on {t2}. My intern made more than that last quarter. BY ACCIDENT.',
      '${l1} on {t1} in fees ALONE. Not losses. FEES. Do you understand the difference?',
      '{s2} trades on {t2}. Each one a small financial crime against yourself.',
    ],
    closers: [
      "Free alpha: delete the app. That's it. Just delete it.",
      'Paper trade for one year. Then we\'ll reassess. Actually, two years.',
      "Touch grass. Come back with a plan. A REAL plan. Not this.",
      "I'm going to need you to not tell anyone we know each other.",
      'The market is humbling. You have been very thoroughly humbled.',
      'My therapist charges $400 an hour. You should go. Tell her about {t1}.',
    ],
  },
  {
    key: 'monk',
    emoji: '🧘',
    label: 'Buddhist Monk',
    tagline: 'Detached wisdom',
    openers: [
      'I have sat with this audit in stillness. The silence afterward was instructive.',
      'The river releases water without grief. You have released ${total}. The river is proud.',
      'Attachment is the root of suffering. This audit is a detailed map of the root system.',
      'I lit incense before reviewing this. I lit more after reading {t1}.',
      'We do not lose money. We return it to the flow. You have been very giving.',
      'I fasted before reading this. I needed the clarity.',
    ],
    mids: [
      'You traded {t1} {s1} times. Each trade a small flame. Each flame brief. Each loss a teacher.',
      'The ${l1} released to {t1} was not failure. It was tuition. The universe charges market rates.',
      '{t1} came as a lesson in impermanence. The lesson cost ${l1}. Consider it received.',
      'You returned to {t2} after the first wound. That is either courage or the ego. The ego is persistent.',
      'The {t2} position asked you to release ${l2}. You said yes {s2} times. Very generous.',
      '{t2} taught impermanence. Specifically, the impermanence of ${l2}.',
      'You did not lose ${l1} on {t1}. You simply stopped holding it. All holding ends.',
      '{s1} trades on {t1}. In Zen, this is called repetition of learning. In finance, something else.',
    ],
    closers: [
      'You are not your losses. You are the awareness that watches them happen. Breathe.',
      'Even the Buddha had bad days. He did not record them on a public blockchain.',
      'The candle burns. The fees pass. What remains is wisdom. And this audit.',
      'Close the app. Sit. The market will still be there. So will your patterns.',
      'I will light a candle for your portfolio. I lit one for {t1}. It was a small candle.',
      'The ego said the trade would recover. The ego is always certain. The ego is frequently wrong.',
    ],
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function fillSlots(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function buildRoast(
  voice: VoiceDef,
  tokenBreakdown: Array<{ symbol: string; totalFeesUsd: number; swapCount: number }>,
  totalLeakageUsd: number,
): string {
  const top = tokenBreakdown.slice(0, 3);
  const vars: Record<string, string> = {
    t1: top[0]?.symbol ?? 'that token',
    l1: (top[0]?.totalFeesUsd ?? 0).toFixed(2),
    s1: String(top[0]?.swapCount ?? 0),
    t2: top[1]?.symbol ?? top[0]?.symbol ?? 'it again',
    l2: (top[1]?.totalFeesUsd ?? top[0]?.totalFeesUsd ?? 0).toFixed(2),
    s2: String(top[1]?.swapCount ?? top[0]?.swapCount ?? 0),
    t3: top[2]?.symbol ?? top[1]?.symbol ?? 'the rest',
    l3: (top[2]?.totalFeesUsd ?? 0).toFixed(2),
    total: totalLeakageUsd.toFixed(2),
  };

  const opener = fillSlots(pickRandom(voice.openers), vars);
  const [mid1, mid2] = pickN(voice.mids, 2).map((t) => fillSlots(t, vars));
  const closer = fillSlots(pickRandom(voice.closers), vars);

  return [opener, mid1, mid2, closer].join('\n\n');
}

function GriefCounselorCard({
  tokenBreakdown,
  totalLeakageUsd,
}: {
  tokenBreakdown: Array<{ symbol: string; totalFeesUsd: number; swapCount: number }>;
  totalLeakageUsd: number;
}) {
  const [phase, setPhase] = useState<'idle' | 'selecting' | 'roasting'>('idle');
  const [roastText, setRoastText] = useState('');
  const [activeVoice, setActiveVoice] = useState<VoiceDef | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSelectVoice(voice: VoiceDef) {
    const text = buildRoast(voice, tokenBreakdown, totalLeakageUsd);
    setActiveVoice(voice);
    setRoastText(text);
    setPhase('roasting');
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(`${roastText}\n\nrektreceipt.xyz`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReroll() {
    if (!activeVoice) return;
    setRoastText(buildRoast(activeVoice, tokenBreakdown, totalLeakageUsd));
  }

  if (phase === 'idle') {
    return (
      <button
        onClick={() => setPhase('selecting')}
        className="w-full border border-[#1f2937] hover:border-[#2d3748] rounded-lg bg-[#111111] py-3 text-xs font-mono text-[#6b7280] hover:text-[#9ca3af] transition-colors"
      >
        Get Roasted →
      </button>
    );
  }

  if (phase === 'selecting') {
    return (
      <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4">
        <p className="text-[#00ff88] text-xs tracking-widest font-mono mb-3">GRIEF COUNSELOR</p>
        <p className="text-[#6b7280] text-xs font-mono mb-4">Choose your voice.</p>
        <div className="grid grid-cols-3 gap-2">
          {VOICES.map((v) => (
            <button
              key={v.key}
              onClick={() => handleSelectVoice(v)}
              className="flex flex-col items-center gap-2 border border-[#1f2937] hover:border-[#2d3748] rounded-lg bg-[#0d0d0d] hover:bg-[#161f2e] p-3 transition-colors text-center"
            >
              <span className="text-2xl">{v.emoji}</span>
              <span className="text-white text-[10px] font-mono font-bold leading-tight">{v.label}</span>
              <span className="text-[#6b7280] text-[9px] font-mono leading-tight">{v.tagline}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setPhase('idle')}
          className="mt-3 w-full text-[#374151] hover:text-[#6b7280] text-xs font-mono transition-colors"
        >
          cancel
        </button>
      </div>
    );
  }

  return (
    <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#00ff88] text-xs tracking-widest font-mono">GRIEF COUNSELOR</p>
        <span className="text-[10px] font-mono text-[#6b7280]">
          {activeVoice?.emoji} {activeVoice?.label}
        </span>
      </div>
      <p className="text-[#9ca3af] text-xs font-mono leading-relaxed whitespace-pre-line mb-4">
        {roastText}
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 border border-[#1f2937] hover:border-[#2d3748] text-[#9ca3af] hover:text-white py-1.5 rounded text-xs font-mono transition-colors"
        >
          {copied ? 'Copied!' : 'Share this roast'}
        </button>
        <button
          onClick={handleReroll}
          className="border border-[#1f2937] hover:border-[#2d3748] text-[#6b7280] hover:text-[#9ca3af] px-3 py-1.5 rounded text-xs font-mono transition-colors"
          title="Different roast, same voice"
        >
          ↺
        </button>
        <button
          onClick={() => { setPhase('selecting'); setRoastText(''); }}
          className="border border-[#1f2937] hover:border-[#2d3748] text-[#6b7280] hover:text-[#9ca3af] px-3 py-1.5 rounded text-xs font-mono transition-colors"
          title="Switch voice"
        >
          ←
        </button>
      </div>
    </div>
  );
}

// ─── Accordion ───────────────────────────────────────────────────────────────

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

type NavLink = { label: string; href: string } | { divider: true };

const MOBILE_NAV_LINKS: NavLink[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Signals', href: '/signals' },
  { divider: true },
  { label: 'Rektboard', href: '/rektboard' },
  { label: 'Graveyard', href: '/graveyard' },
  { label: 'Alpha Feed', href: '/alpha' },
  { label: 'Best Traders', href: '/bestboard' },
  { label: 'Compare', href: '/compare' },
  { divider: true },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Score', href: '/score' },
  { divider: true },
  { label: 'Developers', href: '/developers' },
];

const MOBILE_LINKS = MOBILE_NAV_LINKS.filter(
  (l): l is { label: string; href: string } => !('divider' in l),
);

const EXPLORE_LINKS: NavLink[] = [
  { label: 'Rektboard', href: '/rektboard' },
  { label: 'Graveyard', href: '/graveyard' },
  { label: 'Alpha Feed', href: '/alpha' },
  { label: 'Best Traders', href: '/bestboard' },
  { label: 'Compare', href: '/compare' },
  { divider: true },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Signals', href: '/signals' },
  { label: 'Score', href: '/score' },
  { divider: true },
  { label: 'Developers', href: '/developers' },
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
        <div className="absolute right-0 top-full mt-2 w-48 border border-[#1f2937] rounded-lg bg-[#111111] overflow-hidden z-50 shadow-xl">
          {EXPLORE_LINKS.map((link, i) =>
            'divider' in link ? (
              <div key={i} className="border-t border-[#1f2937]" />
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="nav-link block px-4 py-2.5 text-xs font-mono text-[#9ca3af] hover:text-white hover:bg-[#161f2e] transition-colors"
              >
                {link.label}
              </Link>
            ),
          )}
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const rafRef = useRef(0);
  const navRef = useRef<HTMLDivElement>(null);

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

  // ── Matrix rain canvas ──
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    console.log('matrix started');

    const CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    canvas.style.opacity = '1';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d')!;
    let W = window.innerWidth;
    let H = window.innerHeight;
    let FS = W < 768 ? 11 : 13;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let drops = Array.from({ length: Math.floor(W / FS) }, () =>
      Math.floor(Math.random() * -(H / FS)),
    );
    let last = 0;
    let running = true;

    function draw(now: number) {
      if (!running) return;
      rafRef.current = requestAnimationFrame(draw);
      if (now - last < 33) return;
      last = now;

      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#00ff88';
      ctx.font = `${FS}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        // edge fade: center 40% at 0.055, linear falloff to 0.01 at edges
        const dist = Math.abs((i * FS) / W - 0.5);
        ctx.globalAlpha = dist <= 0.2 ? 0.055 : 0.055 - 0.045 * Math.min((dist - 0.2) / 0.3, 1);
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * FS, drops[i] * FS);
        if (drops[i] * FS > H && Math.random() > 0.975)
          drops[i] = Math.floor(Math.random() * -10);
        drops[i]++;
      }
      ctx.globalAlpha = 1;
    }

    rafRef.current = requestAnimationFrame(draw);

    function onResize() {
      W = window.innerWidth;
      H = window.innerHeight;
      FS = W < 768 ? 11 : 13;
      const newDpr = window.devicePixelRatio || 1;
      canvas.width = W * newDpr;
      canvas.height = H * newDpr;
      ctx.scale(newDpr, newDpr);
      drops = Array.from({ length: Math.floor(W / FS) }, () =>
        Math.floor(Math.random() * -(H / FS)),
      );
    }

    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      canvas.remove();
    };
  }, []);

  // ── Typewriter subheading ──
  const SUBHEADING_TEXT =
    "Audit your wallet’s execution quality — slippage, fees, and Jito tips.";
  const [typedText, setTypedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedText(SUBHEADING_TEXT);
      setTypingDone(true);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTypedText(SUBHEADING_TEXT.slice(0, i));
      if (i >= SUBHEADING_TEXT.length) { clearInterval(id); setTypingDone(true); }
    }, 35);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stat count-up ──
  const [displayAmount, setDisplayAmount] = useState(0);
  useEffect(() => {
    if (!stats || stats.topLeakageUsd <= 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayAmount(stats.topLeakageUsd);
      return;
    }
    const target = stats.topLeakageUsd;
    const start = performance.now();
    const DUR = 1000;
    let raf = 0;
    function tick(now: number) {
      const t = Math.min((now - start) / DUR, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayAmount(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplayAmount(target);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stats]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

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
      localStorage.setItem('rektreceipt-last-wallet', wallet.trim());
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

  return (
    <main className="min-h-screen text-white px-4 sm:px-6 py-8 sm:py-12" style={{ position: 'relative', zIndex: 1, backgroundColor: 'transparent' }}>
      <div className="max-w-[900px] mx-auto flex flex-col gap-6">

        {/* ── Nav ── */}
        <div ref={navRef} className="flex flex-col relative">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight font-mono">RektReceipt</h1>
            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/dashboard" className="nav-link text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
                Dashboard
              </Link>
              <Link href="/signals" className="nav-link text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
                Signals
              </Link>
              <ExploreDropdown />
            </div>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden"
              style={{ background: 'none', border: 'none', outline: 'none', padding: 0, cursor: 'pointer' }}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="1" y="5" width="22" height="2" fill="white" />
                <rect x="1" y="11" width="22" height="2" fill="white" />
                <rect x="1" y="17" width="22" height="2" fill="white" />
              </svg>
            </button>
          </div>
          {/* Mobile dropdown — absolute overlay, full viewport width */}
          {mobileMenuOpen && (
            <div
              className="md:hidden"
              style={{
                position: 'absolute',
                left: '-16px',
                right: '-16px',
                top: '100%',
                zIndex: 50,
                backgroundColor: '#0a0a0a',
                borderBottom: '1px solid #1a1a1a',
              }}
            >
              {MOBILE_LINKS.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    color: 'white',
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '18px',
                    paddingBottom: '18px',
                    ...(i < MOBILE_LINKS.length - 1 ? { borderBottom: '1px solid #1a1a1a' } : {}),
                  }}
                  className="hover:bg-[#111111] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Hero — shown until first result loads ── */}
        {!result && (
          <div className="flex flex-col items-center gap-6 pt-8 pb-12 sm:py-14">
            <div className="flex flex-col items-center gap-2 text-center max-w-xl">
              <h2
                className="hero-heading text-2xl sm:text-3xl font-bold font-mono leading-tight"
                data-text="Find out how much Solana has taken from you."
              >
                Find out how much<br />Solana has taken from you.
              </h2>
              <p className="text-[#6b7280] text-sm font-mono">
                {typedText}
                {!typingDone && <span className="typing-cursor" aria-hidden="true">|</span>}
              </p>
            </div>

            {stats && stats.topLeakageUsd > 0 && stats.shareId && (
              <Link
                href={`/share/${stats.shareId}`}
                className="stat-ticker w-full max-w-[600px] flex items-center gap-2 bg-[#111111] border border-[#1f2937] rounded px-3 py-2 text-xs font-mono hover:border-[#2d3748] transition-colors"
              >
                <span className="text-[#6b7280]">This week&apos;s most rekt wallet lost</span>
                <span className="text-[#ff4444] font-bold">${displayAmount.toFixed(2)}</span>
                {stats.topGrade && (
                  <span className={`font-bold ml-auto ${getGrade(stats.topLeakageUsd).color}`}>
                    {stats.topGrade}
                  </span>
                )}
              </Link>
            )}

            <form onSubmit={handleSubmit} className="w-full max-w-[600px] flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="wallet address..."
                  aria-label="Wallet address"
                  className="w-full bg-[#111111] border border-[#1f2937] rounded px-3 py-2.5 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
                />
                {!address && (
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
                className="w-full bg-[#00ff88] text-black font-bold py-2.5 rounded hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Auditing…' : 'Audit'}
              </button>
            </form>

            <div className="w-full max-w-[600px] grid grid-cols-3 gap-2">
              {[
                { label: 'RUG RADAR', desc: 'Check any token before you ape', href: '/token' },
                { label: 'ALPHA FEED', desc: 'See what A-grade wallets are trading', href: '/alpha' },
                { label: 'GRAVEYARD', desc: 'Tokens that rugged the most wallets', href: '/graveyard' },
              ].map((card, i) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="feature-card border border-[#1f2937] hover:border-[#2d3748] rounded-lg bg-[#111111] hover:bg-[#161f2e] p-3 flex flex-col gap-1.5 transition-colors group"
                  style={{ animationDelay: `${(i + 1) * 0.2}s` }}
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

            <div className="w-full max-w-[600px] flex items-center justify-center gap-4 text-[11px] font-mono text-[#374151] flex-wrap">
              <span>{(stats?.walletCount ?? 0).toLocaleString()} wallets audited</span>
              <span className="text-[#1f2937]">·</span>
              <span>${(stats?.feesFoundUsd ?? 0).toFixed(0)} in fees found</span>
              <span className="text-[#1f2937]">·</span>
              <span>{(stats?.rugsDetected ?? 0)} rugs detected</span>
            </div>

            {error && <p className="text-[#ff4444] text-sm font-mono">{error}</p>}
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <>
            {/* Compact re-audit bar */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="wallet address..."
                aria-label="Wallet address"
                className="flex-1 bg-[#111111] border border-[#1f2937] rounded px-3 py-2 font-mono text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2d3748]"
              />
              <button
                type="submit"
                disabled={loading || !address.trim()}
                className="bg-[#00ff88] text-black font-bold px-4 py-2 rounded text-sm font-mono hover:bg-[#00e67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '…' : 'Audit'}
              </button>
            </form>

            {error && <p className="text-[#ff4444] text-sm font-mono">{error}</p>}

            {/* RektScore — full width */}
            {result.rektScore && (
              <RektScoreCard
                score={result.rektScore}
                wallet={result.wallet}
                stats={{ totalLeakageUsd: result.totalLeakageUsd, transactionCount: result.transactionCount, totalJitoTips: result.totalJitoTips }}
              />
            )}

            {/* Verdict lines — full width, above grid */}
            <div className="border border-[#1f2937] rounded-lg bg-[#111111] px-4 py-3 flex flex-col gap-1.5">
              <p className="text-xs font-mono text-[#6b7280]">
                You lost{' '}
                <span className="text-[#ff4444]">${result.totalLeakageUsd.toFixed(2)}</span>
                {' '}to fees and avoidable costs across {result.transactionCount} swaps.
              </p>
              {result.addressPoisoning?.count === 0 && (
                <p className="text-xs font-mono text-[#6b7280]">No address poisoning attempts detected.</p>
              )}
              {result.peerPercentile != null && Number.isFinite(result.peerPercentile) && (
                <p className={`text-xs font-mono ${result.peerPercentile > 50 ? 'text-[#ff4444]' : 'text-[#00ff88]'}`}>
                  You leaked more than {result.peerPercentile}% of wallets with similar trade volume.
                </p>
              )}
            </div>

            {/* ── Two-column results grid ── */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Left: receipt */}
              <div className="flex flex-col gap-3">
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

                    {/* Realized PnL section */}
                    {result.realizedPnl && (
                      <>
                        <div className="py-2">
                          <p className="text-[10px] font-mono text-[#374151] tracking-widest">REALIZED P&amp;L</p>
                        </div>
                        {result.realizedPnl.closedPositions === 0 ? (
                          <div className="py-2">
                            <p className="text-[#6b7280] text-xs font-mono italic">No closed positions found in recent history</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between py-2 text-xs sm:text-sm font-mono">
                              <span className="text-[#6b7280]">Total Realized SOL</span>
                              <span className={result.realizedPnl.totalRealizedSOL >= 0 ? 'text-[#00ff88] font-bold' : 'text-[#ff4444] font-bold'}>
                                {result.realizedPnl.totalRealizedSOL >= 0 ? '+' : ''}{result.realizedPnl.totalRealizedSOL.toFixed(4)} SOL
                              </span>
                            </div>
                            <div className="flex justify-between py-2 text-xs sm:text-sm font-mono">
                              <span className="text-[#6b7280]">Win Rate</span>
                              <span className="text-white">{result.realizedPnl.winRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between py-2 text-xs sm:text-sm font-mono">
                              <span className="text-[#6b7280]">Closed Positions</span>
                              <span className="text-white">{result.realizedPnl.closedPositions}</span>
                            </div>
                            <div className="flex justify-between py-2 text-xs sm:text-sm font-mono">
                              <span className="text-[#6b7280]">Avg P&amp;L per Trade</span>
                              <span className={result.realizedPnl.avgPnlPerTrade >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}>
                                {result.realizedPnl.avgPnlPerTrade >= 0 ? '+' : ''}{result.realizedPnl.avgPnlPerTrade.toFixed(4)} SOL
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[#1f2937]">
                    <span className="text-[#6b7280] text-xs tracking-widest font-mono">TOTAL REKT</span>
                    <span className="text-[#ff4444] font-bold text-base sm:text-lg">
                      ${result.totalLeakageUsd.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: analysis accordions */}
              <div className="flex flex-col gap-3">
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
              </div>
            </div>

            {result.tokenBreakdown.length > 0 && (
              <GriefCounselorCard
                tokenBreakdown={result.tokenBreakdown}
                totalLeakageUsd={result.totalLeakageUsd}
              />
            )}

            {/* ── Full-width: projection + address poisoning ── */}
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

            {/* ── Actions ── */}
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
                href={`/timeline/${result.wallet}`}
                className="nav-link text-[#6b7280] text-xs font-mono transition-colors"
              >
                Trade timeline
              </Link>
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
        )}

        {/* ── Footer ── */}
        <div className="flex justify-end items-center gap-3 pt-2">
          <Link href="/tos" className="nav-link text-[#374151] text-[11px] font-mono hover:text-[#6b7280] transition-colors">
            Terms
          </Link>
          <span className="text-[#1f2937] text-[11px] font-mono select-none">·</span>
          <Link href="/privacy" className="nav-link text-[#374151] text-[11px] font-mono hover:text-[#6b7280] transition-colors">
            Privacy
          </Link>
          <span className="text-[#1f2937] text-[11px] font-mono select-none">·</span>
          <Link href="/developers" className="nav-link text-[#374151] text-[11px] font-mono hover:text-[#6b7280] transition-colors">
            Developers
          </Link>
        </div>

      </div>
    </main>
  );
}
