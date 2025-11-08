import { NextRequest, NextResponse } from 'next/server';
import { searchArticles } from '@/lib/db/articles';
import { DEFAULT_LOCALE, isLocale, type AppLocale } from '@/lib/i18n/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q') ?? '';
  const localeParam = (searchParams.get('lang') ?? DEFAULT_LOCALE) as AppLocale;
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchArticles(query, locale, 12);

  return NextResponse.json({
    results: results.map((article) => ({
      slug: article.slug,
      title: locale === 'fa' ? article.titleFa ?? article.titleEn : article.titleEn ?? article.titleFa,
      excerpt:
        locale === 'fa'
          ? article.summaryFa ?? article.excerptFa ?? article.summaryEn ?? article.excerptEn
          : article.summaryEn ?? article.excerptEn ?? article.summaryFa ?? article.excerptFa,
      publishedAt: (article.publishedAt ?? article.updatedAt ?? new Date()).toISOString(),
      source: article.newsSource?.name ?? ''
    }))
  });
}
