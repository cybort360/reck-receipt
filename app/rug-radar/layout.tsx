import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rug Radar',
  description: 'Check any Solana token reputation before you ape. Powered by real wallet audit data.',
  openGraph: {
    title: 'Rug Radar',
    description: 'Check any Solana token reputation before you ape. Powered by real wallet audit data.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rug Radar',
    description: 'Check any Solana token reputation before you ape. Powered by real wallet audit data.',
  },
};

export default function RugRadarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
