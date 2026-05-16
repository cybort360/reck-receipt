import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return [
    { url: `${base}/`,           changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/signals`,    changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/leaderboard`,changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/alpha`,      changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/graveyard`,  changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/rug-radar`,  changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/developers`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/upgrade`,    changeFrequency: 'monthly', priority: 0.6 },
  ];
}
