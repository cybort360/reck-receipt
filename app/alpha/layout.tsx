import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Alpha Feed',
  description: 'See what top-execution wallets on Solana are trading right now, ranked by execution efficiency.',
  openGraph: {
    title: 'Alpha Feed',
    description: 'See what top-execution wallets on Solana are trading right now, ranked by execution efficiency.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alpha Feed',
    description: 'See what top-execution wallets on Solana are trading right now, ranked by execution efficiency.',
  },
};

export default function AlphaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
