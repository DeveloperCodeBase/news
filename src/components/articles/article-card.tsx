import Link from 'next/link';
import Image from 'next/image';
import clsx from 'clsx';
import type { AppLocale } from '@/lib/i18n/config';
import { formatDisplayDate } from '@/lib/news/dates';
import { getLocalizedValue } from '@/lib/news/localization';

export type ArticleSummary = {
  slug: string;
  titleFa: string;
  titleEn: string | null;
  excerptFa: string | null;
  excerptEn: string | null;
  summaryFa: string | null;
  summaryEn: string | null;
  coverImageUrl: string | null;
  publishedAt: Date;
  status: string;
  newsSource:
    | {
        name: string;
        homepageUrl: string | null;
        rssUrl: string | null;
        scrapeUrl: string | null;
        language: string;
        region: string | null;
        topicTags: string[];
        isTrusted: boolean;
      }
    | null;
  categories: Array<{ slug: string; nameFa: string; nameEn: string | null }>;
};

type ArticleCardProps = {
  article: ArticleSummary;
  locale: AppLocale;
};

export default function ArticleCard({ article, locale }: ArticleCardProps) {
  const title = getLocalizedValue(article, locale, 'title');
  const summary = getLocalizedValue(article, locale, 'summary');
  const excerpt = getLocalizedValue(article, locale, 'excerpt');
  const teaser = summary || excerpt;
  const href = `/${locale}/news/${article.slug}`;
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <article
      dir={direction}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/60 shadow-lg shadow-slate-950/40 transition hover:border-sky-500/60 hover:shadow-sky-900/40"
    >
      {article.coverImageUrl ? (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={article.coverImageUrl}
            alt={title}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-105"
            priority={false}
          />
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center bg-slate-800 text-slate-400">Hoosh Gate</div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className={clsx('rounded-full px-2 py-1', article.newsSource?.isTrusted ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200')}>
            {article.newsSource?.name ?? 'نامشخص'}
          </span>
          <time>{formatDisplayDate(article.publishedAt, locale)}</time>
        </div>
        <h3 className="line-clamp-2 text-lg font-semibold text-slate-100">{title}</h3>
        {teaser && <p className="line-clamp-3 text-sm text-slate-300">{teaser}</p>}
        <div className="mt-auto flex flex-wrap gap-2 text-xs text-slate-400">
          {article.categories.slice(0, 2).map((category) => (
            <span key={category.slug} className="rounded-full border border-slate-700/60 px-2 py-1">
              {getLocalizedValue(category, locale, 'name')}
            </span>
          ))}
        </div>
        <Link
          href={href}
          className="mt-3 inline-flex items-center justify-center rounded-full bg-sky-500/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          {locale === 'fa' ? 'مشاهده خبر' : 'View story'}
        </Link>
      </div>
    </article>
  );
}
