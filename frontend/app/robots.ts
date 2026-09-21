import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/sala/', '/perfil'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
