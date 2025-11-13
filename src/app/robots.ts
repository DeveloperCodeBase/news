import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site/url';

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/fa', '/en', '/fa/news', '/en/news'],
      disallow: ['/admin', '/api']
    },
    sitemap: [`${siteUrl}/sitemap.xml`]
  };
}
