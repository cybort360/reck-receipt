import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Token Graveyard',
  description: 'Tokens that rugged the most Solana wallets, tracked from real on-chain audit data.',
  openGraph: {
    title: 'Token Graveyard',
    description: 'Tokens that rugged the most Solana wallets, tracked from real on-chain audit data.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Token Graveyard',
    description: 'Tokens that rugged the most Solana wallets, tracked from real on-chain audit data.',
  },
};

export default function GraveyardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
