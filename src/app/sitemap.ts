import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir';

  return [
    {
      url: `${baseUrl}/fa`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9
    },
    {
      url: `${baseUrl}/fa/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6
    },
    {
      url: `${baseUrl}/fa/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6
    }
  ];
}
