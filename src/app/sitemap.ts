import type { MetadataRoute } from 'next';
import { getHomepageArticles } from '@/lib/db/articles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hooshgate.ir';
  const articles = await getHomepageArticles(50);
  const lastModified = articles[0]?.publishedAt ?? articles[0]?.updatedAt ?? new Date();

  const localizedRoots: MetadataRoute.Sitemap = ['fa', 'en'].map((locale) => ({
    url: `${baseUrl}/${locale}`,
    lastModified,
    changeFrequency: 'hourly',
    priority: locale === 'fa' ? 1 : 0.9
  }));

  const staticPages: MetadataRoute.Sitemap = ['about', 'contact'].flatMap((page) =>
    ['fa', 'en'].map((locale) => ({
      url: `${baseUrl}/${locale}/${page}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6
    }))
  );

  const articleEntries: MetadataRoute.Sitemap = articles.flatMap((article) =>
    ['fa', 'en'].map((locale) => ({
      url: `${baseUrl}/${locale}/news/${article.slug}`,
      lastModified: article.publishedAt ?? article.updatedAt ?? new Date(),
      changeFrequency: 'hourly',
      priority: 0.8
    }))
  );

  return [...localizedRoots, ...staticPages, ...articleEntries];
}
