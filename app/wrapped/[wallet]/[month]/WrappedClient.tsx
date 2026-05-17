'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WrappedData } from '@/lib/wrapped';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TOTAL_SLIDES = 9;

function roastLine(count: number): string {
  if (count < 10) return 'respectable restraint.';
  if (count < 50) return 'active month.';
  if (count < 200) return 'touch grass.';
  return 'seek help.';
}

// ── Base slide container ────────────────────────────────────────────────────

function SlideBase({
  active,
  gradient,
  children,
}: {
  active: boolean;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        opacity: active ? 1 : 0,
        transform: active ? 'scale(1)' : 'scale(0.96)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        pointerEvents: active ? 'all' : 'none',
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <p
      style={{
        fontSize: 8,
        letterSpacing: 4,
        textTransform: 'uppercase',
        color: color ?? '#ff444488',
        marginBottom: 16,
      }}
    >
      {children}
    </p>
  );
}

function Divider({ color }: { color?: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 1,
        background: `linear-gradient(90deg, transparent, ${color ?? '#ff4444'}, transparent)`,
        margin: '14px 0',
      }}
    />
  );
}

// ── Slides ──────────────────────────────────────────────────────────────────

function SlideIntro({
  active,
  monthName,
  year,
  shortWallet,
}: {
  active: boolean;
  monthName: string;
  year: number;
  shortWallet: string;
}) {
  return (
    <SlideBase active={active} gradient="linear-gradient(160deg, #0a0a0a 0%, #0f0005 60%, #0a0a0a 100%)">
      <Eyebrow color="#ff444466">your rekt report</Eyebrow>
      <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
        REKT<span style={{ color: '#ff4444' }}>RECEIPT</span>
      </p>
      <p style={{ color: '#6b7280', fontSize: 11, letterSpacing: 3, marginBottom: 28 }}>
        {monthName.toUpperCase()} {year}
      </p>
      <div
        style={{
          background: '#ffffff08',
          border: '1px solid #ffffff10',
          borderRadius: 8,
          padding: '8px 14px',
          color: '#9ca3af',
          fontSize: 11,
        }}
      >
        {shortWallet}
      </div>
      <p style={{ color: '#374151', fontSize: 10, marginTop: 28, letterSpacing: 1 }}>
        time to face the music
      </p>
    </SlideBase>
  );
}

function SlideFees({ active, totalFeesUsd }: { active: boolean; totalFeesUsd: number }) {
  const amtRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const duration = 1200;

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      if (amtRef.current) {
        amtRef.current.textContent = `$${(totalFeesUsd * eased).toFixed(2)}`;
      }
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, totalFeesUsd]);

  return (
    <SlideBase
      active={active}
      gradient="linear-gradient(160deg, #0a0a0a 0%, #1a0505 50%, #0a0a0a 100%)"
    >
      <Eyebrow color="#ff444488">this month you burned</Eyebrow>
      <div
        ref={amtRef}
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1,
          textShadow: '0 0 40px #ff444466, 0 0 80px #ff444422',
          marginBottom: 8,
        }}
      >
        $0.00
      </div>
      <Divider />
      <p style={{ color: '#ff4444', fontSize: 11, letterSpacing: 2 }}>IN FEES &amp; TIPS</p>
      <p style={{ color: '#4b5563', fontSize: 10, marginTop: 6 }}>that&apos;s not coming back</p>
    </SlideBase>
  );
}

function SlideGrade({ active, grade }: { active: boolean; grade: string }) {
  const [animKey, setAnimKey] = useState(0);
  const prevActive = useRef(false);

  useEffect(() => {
    if (active && !prevActive.current) setAnimKey((k) => k + 1);
    prevActive.current = active;
  }, [active]);

  const gradeColor =
    grade === 'A'
      ? '#00ff88'
      : grade === 'B'
        ? '#88ff88'
        : grade === 'C'
          ? '#ffff00'
          : grade === 'D'
            ? '#ff8800'
            : '#ff4444';

  const subtitle =
    grade === 'A'
      ? 'Impressive.'
      : grade === 'B'
        ? 'Not bad.'
        : grade === 'C'
          ? 'Room to improve.'
          : grade === 'D'
            ? 'Rough month.'
            : 'Congratulations. Really.';

  return (
    <SlideBase
      active={active}
      gradient="linear-gradient(160deg, #0a0a0a 0%, #1a0000 50%, #0a0a0a 100%)"
    >
      <Eyebrow color="#ff444466">your execution grade</Eyebrow>
      <div
        key={animKey}
        style={{
          fontSize: 120,
          fontWeight: 900,
          color: gradeColor,
          lineHeight: 1,
          textShadow: `0 0 60px ${gradeColor}88, 0 0 120px ${gradeColor}33`,
          animation: animKey > 0 ? 'gradeIn 0.3s ease forwards' : undefined,
        }}
      >
        {grade}
      </div>
      <p style={{ color: '#6b7280', fontSize: 11, marginTop: 12 }}>{subtitle}</p>
    </SlideBase>
  );
}

function SlideWorstTrade({
  active,
  worstTrade,
}: {
  active: boolean;
  worstTrade: WrappedData['worstTrade'];
}) {
  const dateStr = worstTrade
    ? new Date(worstTrade.timestamp * 1000)
        .toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
          hour12: false,
        })
        .toUpperCase() + ' UTC'
    : null;

  return (
    <SlideBase
      active={active}
      gradient="linear-gradient(160deg, #0a0a0a 0%, #150a00 50%, #0a0a0a 100%)"
    >
      <Eyebrow color="#ff880066">this is where it went wrong</Eyebrow>
      {worstTrade ? (
        <>
          <p style={{ color: '#fff', fontSize: 28, fontWeight: 900, marginBottom: 6 }}>
            {worstTrade.symbol}
          </p>
          <p style={{ color: '#ff8800', fontSize: 18, fontWeight: 700 }}>
            ${worstTrade.feeUsd.toFixed(2)} in fees
          </p>
          <Divider color="#ff8800" />
          <p style={{ color: '#4b5563', fontSize: 10, letterSpacing: 1 }}>{dateStr}</p>
          <p style={{ color: '#6b7280', fontSize: 10, marginTop: 8 }}>your most expensive single swap</p>
        </>
      ) : (
        <>
          <p style={{ color: '#6b7280', fontSize: 16, fontWeight: 700, textAlign: 'center' }}>
            No single trade stood out
          </p>
          <p style={{ color: '#374151', fontSize: 10, marginTop: 8 }}>
            somehow you spread the damage evenly
          </p>
        </>
      )}
    </SlideBase>
  );
}

function SlideDeadBags({
  active,
  deadTokens,
}: {
  active: boolean;
  deadTokens: WrappedData['deadTokens'];
}) {
  const count = deadTokens.length;
  const shown = deadTokens.slice(0, 4);
  const extra = count - shown.length;

  return (
    <SlideBase
      active={active}
      gradient="linear-gradient(160deg, #0a0a0a 0%, #0a0a00 50%, #0a0a0a 100%)"
    >
      <Eyebrow color="#ff880044">tokens bought, never sold</Eyebrow>
      <p
        style={{
          fontSize: 80,
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1,
          textShadow: '0 0 40px #ff880044',
        }}
      >
        {count}
      </p>
      <p style={{ color: '#ff8800', fontSize: 11, letterSpacing: 2, marginTop: 8 }}>DEAD BAGS</p>
      <Divider color="#ff8800" />
      {count > 0 ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {shown.map((t) => (
            <span
              key={t.mint}
              style={{
                background: '#ffffff08',
                border: '1px solid #ff880022',
                borderRadius: 4,
                padding: '3px 8px',
                color: '#ff8800',
                fontSize: 9,
              }}
            >
              {t.symbol}
            </span>
          ))}
          {extra > 0 && (
            <span
              style={{
                background: '#ffffff08',
                border: '1px solid #ff880022',
                borderRadius: 4,
                padding: '3px 8px',
                color: '#6b7280',
                fontSize: 9,
              }}
            >
              +{extra} more
            </span>
          )}
        </div>
      ) : (
        <p style={{ color: '#374151', fontSize: 10 }}>clean portfolio. suspicious.</p>
      )}
    </SlideBase>
  );
}

function SlidePersonality({
  active,
  personality,
}: {
  active: boolean;
  personality: WrappedData['personality'];
}) {
  return (
    <SlideBase
      active={active}
      gradient="linear-gradient(160deg, #0a0a0a 0%, #050a15 50%, #0a0a0a 100%)"
    >
      <Eyebrow color="#00ff8844">your trader type</Eyebrow>
      <p
        style={{
          color: '#00ff88',
          fontSize: 22,
          fontWeight: 900,
          textShadow: '0 0 30px #00ff8866',
          marginBottom: 10,
          textAlign: 'center',
        }}
      >
        {personality.type}
      </p>
      <Divider color="#00ff88" />
      <p
        style={{
          color: '#6b7280',
          fontSize: 11,
          textAlign: 'center',
          lineHeight: 1.6,
          maxWidth: 220,
        }}
      >
        {personality.description}
      </p>
    </SlideBase>
  );
}

function SlideCommunity({
  active,
  topPct,
}: {
  active: boolean;
  topPct: number | null;
}) {
  return (
    <SlideBase
      active={active}
      gradient="linear-gradient(160deg, #0a0a0a 0%, #0a0a1a 50%, #0a0a0a 100%)"
    >
      <Eyebrow color="#ffffff33">community rank</Eyebrow>
      {topPct !== null ? (
        <>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.2,
              textShadow: '0 0 40px #ffffff22',
              textAlign: 'center',
            }}
          >
            TOP
            <br />
            <span style={{ color: '#ff4444', fontSize: 72 }}>{topPct}%</span>
          </div>
          <Divider color="#ffffff44" />
          <p style={{ color: '#6b7280', fontSize: 11, textAlign: 'center' }}>
            more rekt than {100 - topPct}% of all audited wallets
          </p>
        </>
      ) : (
        <>
          <p style={{ color: '#6b7280', fontSize: 16, fontWeight: 700 }}>Not enough data</p>
          <Divider color="#ffffff44" />
          <p style={{ color: '#374151', fontSize: 10, textAlign: 'center' }}>
            check back when more wallets have been audited
          </p>
        </>
      )}
    </SlideBase>
  );
}

function SlideSwaps({ active, swapCount }: { active: boolean; swapCount: number }) {
  return (
    <SlideBase
      active={active}
      gradient="linear-gradient(160deg, #0a0a0a 0%, #001a0a 50%, #0a0a0a 100%)"
    >
      <Eyebrow color="#00ff8833">swaps this month</Eyebrow>
      <p style={{ fontSize: 80, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{swapCount}</p>
      <p style={{ color: '#00ff88', fontSize: 11, letterSpacing: 2, marginTop: 8 }}>TRANSACTIONS</p>
      <Divider color="#00ff88" />
      <p style={{ color: '#374151', fontSize: 11, fontStyle: 'italic' }}>{roastLine(swapCount)}</p>
    </SlideBase>
  );
}

function SlideShare({
  active,
  monthName,
  year,
  wallet,
  yyyyMm,
  copied,
  onShare,
}: {
  active: boolean;
  monthName: string;
  year: number;
  wallet: string;
  yyyyMm: string;
  copied: boolean;
  onShare: () => void;
}) {
  return (
    <SlideBase
      active={active}
      gradient="linear-gradient(160deg, #0a0a0a 0%, #0f0a00 50%, #0a0a0a 100%)"
    >
      <Eyebrow color="#ffffff33">
        rekt wrapped · {monthName.toLowerCase()} {year}
      </Eyebrow>
      <p
        style={{
          color: '#fff',
          fontSize: 18,
          fontWeight: 900,
          textAlign: 'center',
          marginBottom: 6,
          lineHeight: 1.4,
        }}
      >
        You survived.
        <br />
        Barely.
      </p>
      <p style={{ color: '#6b7280', fontSize: 10, marginBottom: 24, textAlign: 'center' }}>
        share your rekt story
      </p>
      <button
        onClick={onShare}
        style={{
          position: 'relative',
          zIndex: 25,
          background: copied ? '#00ff88' : '#ff4444',
          color: '#000',
          fontWeight: 900,
          fontSize: 11,
          padding: '10px 24px',
          borderRadius: 6,
          letterSpacing: 1,
          cursor: 'pointer',
          border: 'none',
          fontFamily: 'monospace',
          transition: 'background 0.2s ease',
        }}
      >
        {copied ? 'COPIED!' : 'SHARE MY WRAPPED →'}
      </button>
      <p style={{ color: '#374151', fontSize: 9, marginTop: 16 }}>
        rektreceipt.xyz/wrapped/{wallet.slice(0, 4)}…/{yyyyMm}
      </p>
    </SlideBase>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function WrappedClient({ data }: { data: WrappedData }) {
  const [current, setCurrent] = useState(0);
  const [copied, setCopied] = useState(false);
  const currentRef = useRef(0);

  const goTo = useCallback((idx: number) => {
    const next = Math.max(0, Math.min(TOTAL_SLIDES - 1, idx));
    setCurrent(next);
    currentRef.current = next;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goTo(currentRef.current + 1);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(currentRef.current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo]);

  // Auto-advance after 4s to match the fillBar animation
  useEffect(() => {
    if (current >= TOTAL_SLIDES - 1) return;
    const id = setTimeout(() => goTo(current + 1), 4000);
    return () => clearTimeout(id);
  }, [current, goTo]);

  const share = useCallback(() => {
    const yyyyMm = `${data.year}-${String(data.month).padStart(2, '0')}`;
    const url = `${window.location.origin}/wrapped/${data.wallet}/${yyyyMm}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data.year, data.month, data.wallet]);

  const monthName = MONTH_NAMES[data.month - 1];
  const yyyyMm = `${data.year}-${String(data.month).padStart(2, '0')}`;
  const shortWallet = `${data.wallet.slice(0, 4)}…${data.wallet.slice(-4)}`;
  // communityPercentile = % of wallets with lower leakage (0=least rekt, 100=most rekt)
  // topPct = "you are in the TOP X% most rekt wallets" — floored at 1 to avoid "TOP 0%"
  const topPct =
    data.communityPercentile !== null ? Math.max(1, 100 - data.communityPercentile) : null;

  return (
    <div
      style={{
        height: '100dvh',
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes fillBar { from { width: 0% } to { width: 100% } }
        @keyframes gradeIn { from { opacity: 0; transform: scale(1.3) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      {/* Segmented progress bar */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          gap: 4,
          zIndex: 10,
        }}
      >
        {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 2,
              background: '#ffffff18',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <div
              key={i === current ? `active-${current}` : `rest-${i}`}
              style={{
                height: '100%',
                background: '#fff',
                width: i < current ? '100%' : i > current ? '0%' : undefined,
                animation: i === current ? 'fillBar 4s linear forwards' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Slides */}
      <SlideIntro
        active={current === 0}
        monthName={monthName}
        year={data.year}
        shortWallet={shortWallet}
      />
      <SlideFees active={current === 1} totalFeesUsd={data.totalFeesUsd} />
      <SlideGrade active={current === 2} grade={data.grade} />
      <SlideWorstTrade active={current === 3} worstTrade={data.worstTrade} />
      <SlideDeadBags active={current === 4} deadTokens={data.deadTokens} />
      <SlidePersonality active={current === 5} personality={data.personality} />
      <SlideCommunity active={current === 6} topPct={topPct} />
      <SlideSwaps active={current === 7} swapCount={data.swapCount} />
      <SlideShare
        active={current === 8}
        monthName={monthName}
        year={data.year}
        wallet={data.wallet}
        yyyyMm={yyyyMm}
        copied={copied}
        onShare={share}
      />

      {/* Left tap zone (prev) */}
      <div
        onClick={() => goTo(current - 1)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '45%',
          zIndex: 20,
          cursor: 'pointer',
        }}
      />
      {/* Right tap zone (next) */}
      <div
        onClick={() => goTo(current + 1)}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '45%',
          zIndex: 20,
          cursor: 'pointer',
        }}
      />

      {/* Desktop arrow buttons — hidden on mobile via Tailwind */}
      <button
        className="hidden md:flex"
        onClick={() => goTo(current - 1)}
        style={{
          position: 'absolute',
          top: '50%',
          left: 16,
          transform: 'translateY(-50%)',
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: '#ffffff10',
          border: '1px solid #ffffff20',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: 14,
          cursor: 'pointer',
          zIndex: 30,
        }}
      >
        ‹
      </button>
      <button
        className="hidden md:flex"
        onClick={() => goTo(current + 1)}
        style={{
          position: 'absolute',
          top: '50%',
          right: 16,
          transform: 'translateY(-50%)',
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: '#ffffff10',
          border: '1px solid #ffffff20',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: 14,
          cursor: 'pointer',
          zIndex: 30,
        }}
      >
        ›
      </button>
    </div>
  );
}
