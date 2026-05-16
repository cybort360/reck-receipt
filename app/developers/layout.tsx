import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developers',
  description: 'Public API for querying Solana wallet RektScores. Free, rate-limited, no auth required.',
  openGraph: {
    title: 'Developers',
    description: 'Public API for querying Solana wallet RektScores. Free, rate-limited, no auth required.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Developers',
    description: 'Public API for querying Solana wallet RektScores. Free, rate-limited, no auth required.',
  },
};

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
