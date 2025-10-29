import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/fa', '/en'],
      disallow: ['/admin', '/api']
    },
    sitemap: [`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir'}/sitemap.xml`]
  };
}
