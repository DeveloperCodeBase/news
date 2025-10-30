import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir';
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/fa', '/en', '/fa/news', '/en/news'],
      disallow: ['/admin', '/api']
    },
    sitemap: [`${siteUrl}/sitemap.xml`]
  };
}
