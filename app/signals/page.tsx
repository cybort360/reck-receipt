import Link from 'next/link';
import type { Metadata } from 'next';
import { listSignalProviders } from '@/lib/signals';
import { SignalMarketplace } from '@/components/SignalMarketplace';
import type { ProviderCard } from '@/components/SignalMarketplace';

export const metadata: Metadata = {
  title: 'Signal Marketplace — Verified On-Chain Track Records',
  description:
    'Follow Solana traders with verified on-chain execution scores. Every signal provider has a public RektScore audit.',
};

export default async function SignalsPage() {
  const raw = await listSignalProviders();

  const providers: ProviderCard[] = raw
    .map((p) => ({
      wallet: p.wallet,
      name: p.name,
      rektScore: p.rektScore,
      grade: p.grade,
      priceUsdc: p.priceUsdc,
      subscribers: p.subscribers,
    }))
    .sort((a, b) => b.rektScore - a.rektScore);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              className="text-xl font-bold font-mono hover:opacity-80 transition-opacity"
            >
              RektReceipt
            </Link>
            <h2 className="text-white text-lg font-bold font-mono">Signal Marketplace</h2>
            <p className="text-[#6b7280] text-xs font-mono">
              Verified on-chain track records. Every provider has a public RektScore.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href="/signals/apply"
              className="border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10 px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors"
            >
              Become a Provider
            </Link>
            <Link
              href="/signals/dashboard"
              className="text-[#6b7280] text-xs font-mono hover:text-[#9ca3af] transition-colors"
            >
              Provider Dashboard →
            </Link>
          </div>
        </div>

        <div className="border border-[#00ff88]/20 bg-[#00ff88]/5 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-white text-sm font-bold font-mono">Are you a top trader?</p>
            <p className="text-[#6b7280] text-xs font-mono">
              Apply to provide signals and earn from your on-chain track record.
            </p>
          </div>
          <Link
            href="/signals/apply"
            className="shrink-0 bg-[#00ff88] text-black font-bold px-4 py-2 rounded text-xs font-mono hover:bg-[#00e67a] transition-colors"
          >
            Apply →
          </Link>
        </div>

        <SignalMarketplace providers={providers} />

      </div>
    </main>
  );
}
