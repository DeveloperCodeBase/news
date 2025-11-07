import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/lib/i18n/config';
import { getHomepageArticles } from '@/lib/db/articles';
import ArticleCard from '@/components/articles/article-card';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function NewsIndexPage({ params }: { params: { locale: AppLocale } }) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'home' });
  const articles = await getHomepageArticles(36);
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8" dir={direction}>
      <h1 className="text-3xl font-bold text-slate-50">{t('latest')}</h1>
      <p className="mt-2 text-sm text-slate-300">
        {locale === 'fa'
          ? 'لیست کامل خبرهای منتشرشده را در این صفحه دنبال کنید.'
          : 'Browse the full stream of recently published AI stories.'}
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard
            key={article.slug}
            article={{
              slug: article.slug,
              titleFa: article.titleFa,
              titleEn: article.titleEn,
              excerptFa: article.excerptFa,
              excerptEn: article.excerptEn,
              summaryFa: article.summaryFa,
              summaryEn: article.summaryEn,
              coverImageUrl: article.coverImageUrl,
              publishedAt: article.publishedAt,
              status: article.status,
              newsSource: article.newsSource,
              categories: article.categories.map(({ category }) => ({
                slug: category.slug,
                nameFa: category.nameFa,
                nameEn: category.nameEn ?? null
              }))
            }}
            locale={locale}
          />
        ))}
        {articles.length === 0 && (
          <p className="text-sm text-slate-400">
            {locale === 'fa' ? 'خبر جدیدی موجود نیست.' : 'No stories are available yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
