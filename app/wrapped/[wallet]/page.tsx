import { redirect } from 'next/navigation';
import Link from 'next/link';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

export default async function WrappedLatestPage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  const yyyyMm = await redis.get<string>(KEYS.wrappedLatest(wallet));

  if (yyyyMm) {
    redirect(`/wrapped/${wallet}/${yyyyMm}`);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col items-center justify-center px-4">
      <p className="text-[#ff4444] text-[10px] tracking-widest mb-4">REKT WRAPPED</p>
      <h1 className="text-2xl font-bold mb-3 text-center">No Wrapped yet</h1>
      <p className="text-[#6b7280] text-sm text-center mb-8 max-w-xs leading-relaxed">
        Rekt Wrapped is generated on the 1st of each month for Pro members.
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
