'use client';

import type { WrappedData } from '@/lib/wrapped';

interface Props {
  data: WrappedData;
}

export function WrappedClient({ data: _ }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex items-center justify-center">
      <p className="text-[#6b7280] text-sm">Loading Wrapped…</p>
    </div>
  );
}
