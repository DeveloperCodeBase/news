import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { getArticleBySlug, getRelatedArticles } from '@/lib/db/articles';
import type { AppLocale } from '@/lib/i18n/config';
import { getLocalizedValue } from '@/lib/news/localization';
import { formatDisplayDate } from '@/lib/news/dates';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export async function generateMetadata({ params }: { params: { locale: AppLocale; slug: string } }): Promise<Metadata> {
  const { slug, locale } = params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: 'article' });
  const title = getLocalizedValue(article, locale, 'title');
  const description = getLocalizedValue(article, locale, 'excerpt');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir';
  const url = `${siteUrl}/${locale}/news/${article.slug}`;

  const images = article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: article.publishedAt.toISOString(),
      images
    },
    alternates: {
      canonical: url,
      languages: {
        fa: `${siteUrl}/fa/news/${article.slug}`,
        en: `${siteUrl}/en/news/${article.slug}`
      }
    }
  };
}

export default async function ArticlePage({ params }: { params: { locale: AppLocale; slug: string } }) {
  const { slug, locale } = params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: 'article' });
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  const title = getLocalizedValue(article!, locale, 'title');
  const content = getLocalizedValue(article!, locale, 'content');
  const excerpt = getLocalizedValue(article!, locale, 'excerpt');
  const safeContent = content || (excerpt ? `<p>${excerpt}</p>` : '');

  const related = await getRelatedArticles(
    article!.id,
    article!.categories.map((item) => item.category.id)
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    datePublished: article!.publishedAt.toISOString(),
    mainEntityOfPage: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir'}/${locale}/news/${article!.slug}`,
    image: article!.coverImageUrl,
    author: {
      '@type': 'Organization',
      name: 'Vista AI News'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Vista AI News',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir'}/logo.png`
      }
    }
  };

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8" dir={direction}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className={article!.source.isTrusted ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200' : 'rounded-full bg-amber-500/10 px-3 py-1 text-amber-200'}>
            {article!.source.name}
          </span>
          <time>{formatDisplayDate(article!.publishedAt, locale)}</time>
        </div>
        <h1 className="text-4xl font-bold text-slate-50">{title}</h1>
        {excerpt && <p className="text-lg text-slate-300">{excerpt}</p>}
        <p className="text-sm text-slate-400">
          {t('source')}: <a className="text-sky-300 hover:text-sky-200" href={article!.source.url} rel="noopener noreferrer" target="_blank">{article!.source.url}</a>
        </p>
      </header>
      {article!.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article!.coverImageUrl}
          alt={title}
          className="w-full rounded-3xl border border-slate-800/60"
        />
      )}
      <div className="prose max-w-none prose-invert" dangerouslySetInnerHTML={{ __html: safeContent }} />
      <section className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-slate-100">{t('related')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {related.map((item) => (
            <a
              key={item.slug}
              href={`/${locale}/news/${item.slug}`}
              className="rounded-2xl border border-slate-800/50 bg-slate-950/80 p-4 text-sm text-slate-200 transition hover:border-sky-500/60 hover:text-sky-100"
            >
              <span className="block text-sm font-semibold text-slate-100">
                {getLocalizedValue(item, locale, 'title')}
              </span>
              <span className="mt-2 block text-xs text-slate-400">{item.source.name}</span>
            </a>
          ))}
          {related.length === 0 && <p className="text-sm text-slate-400">{locale === 'fa' ? 'خبر مرتبطی ثبت نشده است.' : 'No related stories yet.'}</p>}
        </div>
      </section>
      <section className="flex flex-wrap gap-3 text-sm text-slate-300">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-200">{t('categories')}:</span>
          {article!.categories.map(({ category }) => (
            <span key={category.slug} className="rounded-full border border-slate-700/60 px-3 py-1">
              {getLocalizedValue(category, locale, 'name')}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-200">{t('tags')}:</span>
          {article!.tags.map(({ tag }) => (
            <span key={tag.slug} className="rounded-full border border-slate-700/60 px-3 py-1">
              {getLocalizedValue(tag, locale, 'name')}
            </span>
          ))}
        </div>
      </section>
    </article>
  );
}
