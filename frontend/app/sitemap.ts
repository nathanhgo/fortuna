import type { MetadataRoute } from 'next';
import { GAME_CATALOG } from '@/lib/catalog';
import { getSiteUrl } from '@/lib/siteUrl';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/jogos`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...GAME_CATALOG.map((game) => ({
      url: `${base}${game.path}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: game.available ? 0.8 : 0.4,
    })),
  ];
}
