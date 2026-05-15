'use client';

import { useState } from 'react';
import Link from 'next/link';

const EXAMPLE_RESPONSE = `{
  "score": 74,
  "grade": "B",
  "breakdown": {
    "winRate": 61,
    "slippageEfficiency": 78,
    "disciplineScore": 90,
    "rugResilience": 80,
    "bagHealth": 55
  }
}`;

const CODE_SNIPPET = `async function checkWalletReputation(wallet, minScore = 60) {
  const res = await fetch(
    \`https://rektreceipt.xyz/api/score/\${wallet}\`
  );

  if (res.status === 404) {
    // Wallet has never been audited — no score on file
    return { allowed: false, reason: 'no_audit' };
  }
  if (!res.ok) throw new Error('RektReceipt API error');

  const { score, grade } = await res.json();

  if (score < minScore) {
    return { allowed: false, reason: 'score_too_low', score, grade };
  }

  return { allowed: true, score, grade };
}

// Usage — reject wallets below score 65
const result = await checkWalletReputation(walletAddress, 65);
if (!result.allowed) {
  throw new Error(\`Wallet score \${result.score ?? 'unknown'} below threshold\`);
}`;

function gradeColor(grade: string): string {
  if (grade === 'S' || grade === 'A') return 'text-[#00ff88]';
  if (grade === 'B') return 'text-[#ffd700]';
  if (grade === 'C' || grade === 'D') return 'text-[#ff8800]';
  return 'text-[#ff4444]';
}

const BREAKDOWN_FIELDS: Array<{
  key: keyof typeof EXAMPLE_BREAKDOWN;
  label: string;
  description: string;
}> = [
  { key: 'winRate', label: 'Win Rate', description: 'Profitable tokens traded / total tokens traded' },
  { key: 'slippageEfficiency', label: 'Slippage Efficiency', description: 'How well the wallet controls slippage loss relative to volume' },
  { key: 'disciplineScore', label: 'Discipline Score', description: 'Penalised for over-trading the same token repeatedly' },
  { key: 'rugResilience', label: 'Rug Resilience', description: 'Penalised for each rug pull the wallet was caught in' },
  { key: 'bagHealth', label: 'Bag Health', description: 'Dead-bag value as a share of total fees paid' },
];

const EXAMPLE_BREAKDOWN = {
  winRate: 61,
  slippageEfficiency: 78,
  disciplineScore: 90,
  rugResilience: 80,
  bagHealth: 55,
};

export default function DevelopersPage() {
  const [copied, setCopied] = useState(false);

  function copySnippet() {
    void navigator.clipboard.writeText(CODE_SNIPPET).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xl font-bold font-mono hover:opacity-80 transition-opacity">
              RektReceipt
            </Link>
            <h2 className="text-[#00ff88] text-xs tracking-widest font-mono mt-1">DEVELOPER API</h2>
          </div>
          <Link href="/" className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
            ← Home
          </Link>
        </div>

        {/* Intro */}
        <div className="flex flex-col gap-2">
          <h1 className="text-white text-lg font-bold font-mono">RektScore Public API</h1>
          <p className="text-[#9ca3af] text-sm font-mono leading-relaxed">
            RektReceipt exposes a public API for projects to verify wallet reputation before
            granting whitelist access or presale spots. Every score is derived entirely from
            on-chain execution data — slippage paid, fees burned, rugs survived.
          </p>
        </div>

        {/* Endpoint */}
        <div className="flex flex-col gap-4">
          <p className="text-[#6b7280] text-xs font-mono tracking-widest">ENDPOINT</p>

          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[#00ff88] text-xs font-bold font-mono bg-[#00ff88]/10 border border-[#00ff88]/20 px-2 py-0.5 rounded">
                GET
              </span>
              <code className="text-white text-sm font-mono break-all">
                https://rektreceipt.xyz/api/score/<span className="text-[#00ff88]">{'{wallet}'}</span>
              </code>
            </div>

            <div className="flex flex-col gap-1 border-t border-[#1f2937] pt-4">
              <p className="text-[10px] font-mono text-[#6b7280] tracking-widest">PATH PARAMETER</p>
              <div className="flex items-start gap-3 mt-1">
                <code className="text-[#00ff88] text-xs font-mono shrink-0">wallet</code>
                <p className="text-[#9ca3af] text-xs font-mono leading-relaxed">
                  Solana wallet address (base58). A wallet must have been audited at least once
                  for a score to exist.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#1f2937] pt-4">
              <p className="text-[10px] font-mono text-[#6b7280] tracking-widest">RESPONSES</p>
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex items-center gap-3">
                  <span className="text-[#00ff88] text-xs font-mono w-8">200</span>
                  <span className="text-[#9ca3af] text-xs font-mono">Score found. Returns the object below.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#ff8800] text-xs font-mono w-8">404</span>
                  <span className="text-[#9ca3af] text-xs font-mono">No audit on file for this wallet.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#ff4444] text-xs font-mono w-8">429</span>
                  <span className="text-[#9ca3af] text-xs font-mono">Rate limit exceeded. Retry after the <code className="text-white">Retry-After</code> header.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Example response */}
        <div className="flex flex-col gap-4">
          <p className="text-[#6b7280] text-xs font-mono tracking-widest">EXAMPLE RESPONSE</p>

          <div className="border border-[#1f2937] rounded-lg bg-[#111111] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f2937]">
              <span className="text-[#374151] text-[11px] font-mono">application/json</span>
              <span className="text-[#00ff88] text-[11px] font-mono">200 OK</span>
            </div>
            <pre className="p-4 text-sm font-mono text-[#9ca3af] overflow-x-auto leading-relaxed whitespace-pre">
              {EXAMPLE_RESPONSE}
            </pre>
          </div>

          {/* Score preview */}
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-[#6b7280] tracking-widest">SCORE</span>
                <span className="text-white font-bold font-mono text-3xl">74</span>
              </div>
              <span className={`text-4xl font-bold font-mono ${gradeColor('B')}`}>B</span>
            </div>

            <div className="flex flex-col gap-2.5 border-t border-[#1f2937] pt-4">
              {BREAKDOWN_FIELDS.map(({ key, label, description }) => {
                const value = EXAMPLE_BREAKDOWN[key];
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#9ca3af] text-[11px] font-mono">{label}</span>
                      <span className="text-white text-[11px] font-mono font-bold">{value}</span>
                    </div>
                    <div className="w-full h-1 bg-[#1f2937] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00ff88] rounded-full"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                    <p className="text-[#374151] text-[10px] font-mono">{description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rate limits */}
        <div className="flex flex-col gap-4">
          <p className="text-[#6b7280] text-xs font-mono tracking-widest">RATE LIMITS</p>
          <div className="border border-[#1f2937] rounded-lg bg-[#111111] p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold font-mono text-sm">30 requests / minute</span>
              <span className="text-[#6b7280] text-xs font-mono">per IP address</span>
            </div>
            <p className="text-[#9ca3af] text-xs font-mono leading-relaxed">
              Rate limit headers are included in every response:{' '}
              <code className="text-white">X-RateLimit-Limit</code>,{' '}
              <code className="text-white">X-RateLimit-Remaining</code>.
              On a 429, use <code className="text-white">Retry-After</code> (seconds) before retrying.
              For higher limits, reach out.
            </p>
          </div>
        </div>

        {/* Code snippet */}
        <div className="flex flex-col gap-4">
          <p className="text-[#6b7280] text-xs font-mono tracking-widest">WHITELIST INTEGRATION</p>

          <div className="border border-[#1f2937] rounded-lg bg-[#111111] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1f2937]">
              <span className="text-[#374151] text-[11px] font-mono">JavaScript / TypeScript</span>
              <button
                onClick={copySnippet}
                className="text-xs font-mono font-bold transition-colors px-2 py-0.5 rounded border border-[#1f2937] hover:border-[#2d3748] text-[#6b7280] hover:text-[#9ca3af]"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-[#9ca3af] overflow-x-auto leading-relaxed whitespace-pre">
              {CODE_SNIPPET}
            </pre>
          </div>
        </div>

        {/* Footer note */}
        <div className="border-t border-[#1f2937] pt-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[#374151] text-xs font-mono">
            Scores are cached for 1 hour. Re-audit a wallet at{' '}
            <Link href="/" className="text-[#00ff88] hover:underline">
              rektreceipt.xyz
            </Link>{' '}
            to refresh.
          </p>
          <Link href="/signals" className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors">
            Signal Marketplace →
          </Link>
        </div>

      </div>
    </main>
  );
}
