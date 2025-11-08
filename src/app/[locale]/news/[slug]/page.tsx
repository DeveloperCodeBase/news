import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import clsx from 'clsx';
import { getArticleBySlug, getRelatedArticles } from '@/lib/db/articles';
import type { AppLocale } from '@/lib/i18n/config';
import { getLocalizedValue } from '@/lib/news/localization';
import { formatDisplayDate } from '@/lib/news/dates';
import PageViewTracker from '@/components/analytics/page-view-tracker';
import { resolveExperimentVariant } from '@/lib/experiments/assignment';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

function buildVideoEmbed(videoUrl: string, locale: AppLocale, title: string) {
  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.toLowerCase();

    const baseClasses = 'h-full w-full';

    if (host.includes('youtube.com')) {
      let id = parsed.searchParams.get('v');
      if (!id && parsed.pathname.startsWith('/shorts/')) {
        id = parsed.pathname.split('/').filter(Boolean).pop() ?? null;
      }
      if (!id && parsed.pathname.startsWith('/live/')) {
        id = parsed.pathname.split('/').filter(Boolean).pop() ?? null;
      }
      if (id) {
        const embedUrl = `https://www.youtube.com/embed/${id}`;
        return (
          <iframe
            title={title}
            src={embedUrl}
            className={baseClasses}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      if (id) {
        const embedUrl = `https://www.youtube.com/embed/${id}`;
        return (
          <iframe
            title={title}
            src={embedUrl}
            className={baseClasses}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    if (host.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      if (id) {
        const embedUrl = `https://player.vimeo.com/video/${id}`;
        return (
          <iframe
            title={title}
            src={embedUrl}
            className={baseClasses}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) {
      return (
        <video controls className={`${baseClasses} rounded-xl bg-black`}>
          <source src={videoUrl} />
          {locale === 'fa' ? 'مرورگر شما از ویدیو پشتیبانی نمی‌کند.' : 'Your browser does not support the video element.'}
        </video>
      );
    }
  } catch (error) {
    console.warn('[article] invalid video url', error);
  }

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 text-sm text-sky-300 hover:text-sky-200"
    >
      {locale === 'fa' ? 'مشاهده ویدیو در پنجره جدید' : 'Open video in a new tab'}
    </a>
  );
}

export async function generateMetadata({ params }: { params: { locale: AppLocale; slug: string } }): Promise<Metadata> {
  const { slug, locale } = params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return {};
  }
  const title = getLocalizedValue(article, locale, 'title');
  const localizedSummary = getLocalizedValue(article, locale, 'summary');
  const localizedExcerpt = getLocalizedValue(article, locale, 'excerpt');
  const description = localizedSummary || localizedExcerpt;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hooshgate.ir';
  const url = `${siteUrl}/${locale}/news/${article.slug}`;
  const publishedDate = article.publishedAt ?? article.updatedAt ?? new Date();
  const coverImage = article.coverImageUrl ?? article.sourceImageUrl ?? undefined;

  const images = coverImage ? [{ url: coverImage }] : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: publishedDate.toISOString(),
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
  const summary = getLocalizedValue(article!, locale, 'summary');
  const excerpt = getLocalizedValue(article!, locale, 'excerpt');
  const leadText = summary || excerpt;
  const safeContent = content || (leadText ? `<p>${leadText}</p>` : '');
  const publishedDate = article!.publishedAt ?? article!.updatedAt ?? new Date();
  const coverImage = article!.coverImageUrl ?? article!.sourceImageUrl ?? null;

  const related = await getRelatedArticles(
    article!.id,
    article!.categories.map((item) => item.category.id)
  );

  const visitorKey = cookies().get('hooshgate_visitor')?.value ?? 'anonymous';
  const experiment = await resolveExperimentVariant('article-template', visitorKey);
  const experimentKey = experiment ? 'article-template' : undefined;
  const variantKey = experiment?.key ?? 'classic';
  const isImmersive = variantKey === 'immersive';

  const primaryTopic = article!.topics?.[0];
  const topicBadges = (article!.topics ?? []).slice(0, 3);
  const unknownSourceLabel = locale === 'fa' ? 'منبع نامشخص' : 'Unknown source';
  const videoContent = article!.videoUrl ? buildVideoEmbed(article!.videoUrl, locale, title) : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    datePublished: publishedDate.toISOString(),
    mainEntityOfPage: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hooshgate.ir'}/${locale}/news/${article!.slug}`,
    image: coverImage ?? undefined,
    description: leadText,
    author: {
      '@type': 'Organization',
      name: 'Hoosh Gate Magazine'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Hoosh Gate Magazine',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hooshgate.ir'}/logo.png`
      }
    }
  };

  const headerContent = (
    <>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <span
          className={clsx(
            'rounded-full px-3 py-1',
            article!.newsSource?.isTrusted
              ? 'bg-emerald-500/10 text-emerald-200'
              : 'bg-amber-500/10 text-amber-200'
          )}
        >
          {article!.newsSource?.name ?? unknownSourceLabel}
        </span>
        <time>{formatDisplayDate(publishedDate, locale)}</time>
        {primaryTopic ? (
          <span className="rounded-full bg-sky-500/10 px-3 py-1 text-sky-200">
            {primaryTopic.label}
          </span>
        ) : null}
      </div>
      <h1 className={clsx('font-bold text-slate-50', isImmersive ? 'text-5xl leading-tight' : 'text-4xl')}>
        {title}
      </h1>
      {leadText && (
        <p className={clsx('text-slate-300', isImmersive ? 'text-xl' : 'text-lg')}>
          {leadText}
        </p>
      )}
      <p className="text-sm text-slate-400">
        {t('source')}: {
          (() => {
            const sourceUrl =
              article!.urlCanonical ??
              article!.newsSource?.homepageUrl ??
              article!.newsSource?.rssUrl ??
              article!.newsSource?.scrapeUrl ??
              null;

            if (sourceUrl) {
              return (
                <a className="text-sky-300 hover:text-sky-200" href={sourceUrl} rel="noopener noreferrer" target="_blank">
                  {article!.newsSource?.name ?? sourceUrl}
                </a>
              );
            }

            return <span>{article!.newsSource?.name ?? unknownSourceLabel}</span>;
          })()
        }
      </p>
      {topicBadges.length > 1 ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {topicBadges.map((topic) => (
            <span key={topic.label} className="rounded-full border border-slate-700/60 px-3 py-1 text-slate-200">
              {topic.label}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <article
      className={clsx(
        'mx-auto flex flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8',
        isImmersive ? 'max-w-5xl' : 'max-w-3xl'
      )}
      dir={direction}
    >
      <PageViewTracker
        articleId={article!.id}
        experimentKey={experimentKey}
        variantKey={experiment?.key}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {isImmersive && coverImage ? (
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/40 bg-slate-950/70 shadow-2xl shadow-slate-950/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage} alt={title} className="h-96 w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="relative z-10 space-y-4 p-8">{headerContent}</div>
        </div>
      ) : (
        <header className="space-y-4">{headerContent}</header>
      )}

      {!isImmersive && coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImage} alt={title} className="w-full rounded-3xl border border-slate-800/60" />
      ) : null}

      {videoContent ? (
        <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/60">
          <div className="aspect-video w-full">{videoContent}</div>
        </div>
      ) : null}

      <div
        className={clsx(
          'prose max-w-none prose-invert',
          isImmersive && 'rounded-3xl border border-slate-800/40 bg-slate-950/70 p-8 shadow-inner shadow-slate-950/30'
        )}
        dangerouslySetInnerHTML={{ __html: safeContent }}
      />

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
              <span className="mt-2 block text-xs text-slate-400">{item.newsSource?.name ?? unknownSourceLabel}</span>
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
      <div className="pt-2">
        <Link
          href={`/${locale}/news`}
          className="inline-flex items-center rounded-full border border-slate-700/60 px-4 py-2 text-sm text-sky-300 hover:border-sky-500 hover:text-sky-200"
        >
          {locale === 'fa' ? 'بازگشت به لیست خبرها' : 'Back to news'}
        </Link>
      </div>
    </article>
  );
}
