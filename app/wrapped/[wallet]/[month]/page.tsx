import Link from 'next/link';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';
import type { WrappedData } from '@/lib/wrapped';
import { WrappedClient } from './WrappedClient';

function NoWrappedCTA() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col items-center justify-center px-4">
      <p className="text-[#ff4444] text-[10px] tracking-widest mb-4">REKT WRAPPED</p>
      <h1 className="text-2xl font-bold mb-3 text-center">Wrapped not generated</h1>
      <p className="text-[#6b7280] text-sm text-center mb-8 max-w-xs leading-relaxed">
        No Wrapped found for this wallet and month. Wrapped is generated on the 1st of each month
        for Pro members.
      </p>
      <Link
        href="/upgrade"
        className="bg-[#ff4444] text-black font-bold text-[11px] px-6 py-3 rounded tracking-widest hover:bg-[#ff6666] transition-colors"
      >
        UPGRADE TO PRO
      </Link>
    </main>
  );
}

export default async function WrappedMonthPage({
  params,
}: {
  params: Promise<{ wallet: string; month: string }>;
}) {
  const { wallet, month } = await params;
  const raw = await redis.get<string | WrappedData>(KEYS.wrapped(wallet, month));

  if (!raw) return <NoWrappedCTA />;

  const data: WrappedData = typeof raw === 'string' ? JSON.parse(raw) : raw;

  return <WrappedClient data={data} />;
}
