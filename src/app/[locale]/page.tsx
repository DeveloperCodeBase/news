import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/lib/i18n/config';
import { getHomepageArticles, getCategorySummaries } from '@/lib/db/articles';
import ArticleCard from '@/components/articles/article-card';
import { getLocalizedValue } from '@/lib/news/localization';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function LocaleHomePage({ params }: { params: { locale: AppLocale } }) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'home' });
  const articles = await getHomepageArticles();
  const categories = await getCategorySummaries(locale);

  const hero = articles[0];
  const rest = articles.slice(1);
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8" dir={direction}>
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <span className="inline-flex items-center rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-200">
            {t('heroBadge')}
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold text-slate-50 sm:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base text-slate-300 sm:text-lg">{t('heroSubtitle')}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href={`/${locale}/news`}
              className="rounded-full bg-sky-500/90 px-5 py-2 font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              {t('ctaPrimary')}
            </Link>
            <Link
              href={`/${locale}/about`}
              className="rounded-full border border-slate-700 px-5 py-2 font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
          {hero && (
            <Link
              href={`/${locale}/news/${hero.slug}`}
              className="mt-8 block rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6 transition hover:border-sky-500/60 hover:bg-slate-900/60"
            >
              <div className="flex flex-col gap-3">
                <span className="text-sm text-slate-300">{hero.source.name}</span>
                <h2 className="text-2xl font-semibold text-slate-50">
                  {getLocalizedValue(hero, locale, 'title')}
                </h2>
                <p className="text-sm text-slate-300">
                  {getLocalizedValue(hero, locale, 'summary') || getLocalizedValue(hero, locale, 'excerpt')}
                </p>
              </div>
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-slate-100">{t('latest')}</h2>
          <div className="flex flex-col gap-4 text-sm text-slate-300">
            {articles.slice(0, 4).map((article) => (
              <Link
                key={article.slug}
                href={`/${locale}/news/${article.slug}`}
                className="flex flex-col gap-2 rounded-xl border border-transparent px-3 py-2 transition hover:border-sky-500/60 hover:bg-slate-900"
              >
                <span className="text-sm font-semibold text-slate-100">
                  {getLocalizedValue(article, locale, 'title')}
                </span>
                <span className="text-xs text-slate-400">{article.source.name}</span>
              </Link>
            ))}
            {articles.length === 0 && <p className="text-slate-400">{t('emptyState')}</p>}
          </div>
          <div className="mt-auto">
            <h3 className="text-sm font-semibold text-slate-200">{locale === 'fa' ? 'دسته‌های پرطرفدار' : 'Popular categories'}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category.slug} className="rounded-full border border-slate-700/60 px-3 py-1 text-xs text-slate-300">
                  {getLocalizedValue(category, locale, 'name')} · {category.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-50">{t('latest')}</h2>
          <span className="text-xs uppercase tracking-wide text-slate-400">{t('trustedBadge')} · {t('untrustedBadge')}</span>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
            <ArticleCard key={article.slug} article={{
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
              source: article.source,
              categories: article.categories.map(({ category }) => ({
                slug: category.slug,
                nameFa: category.nameFa,
                nameEn: category.nameEn ?? null
              }))
            }} locale={locale} />
          ))}
          {rest.length === 0 && hero && (
            <ArticleCard
              article={{
                slug: hero.slug,
                titleFa: hero.titleFa,
                titleEn: hero.titleEn,
                excerptFa: hero.excerptFa,
                excerptEn: hero.excerptEn,
                summaryFa: hero.summaryFa,
                summaryEn: hero.summaryEn,
                coverImageUrl: hero.coverImageUrl,
                publishedAt: hero.publishedAt,
                status: hero.status,
                source: hero.source,
                categories: hero.categories.map(({ category }) => ({
                  slug: category.slug,
                  nameFa: category.nameFa,
                  nameEn: category.nameEn ?? null
                }))
              }}
              locale={locale}
            />
          )}
        </div>
      </section>
    </div>
  );
}
