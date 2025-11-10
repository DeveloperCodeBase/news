'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import type { Lang } from '@prisma/client';
import type { ReviewQueueSnapshot } from '@/lib/db/articles';
import type { ArticleStatus } from '@/lib/news/status';
import { formatJalaliDateTime } from '@/lib/time/jalali';
import { parseFaTranslationMeta } from '@/lib/translation/meta';

const REVIEW_STATUS_OPTIONS: { value: ArticleStatus; label: string }[] = [
  { value: 'REVIEWED', label: 'در انتظار بازبینی' },
  { value: 'DRAFT', label: 'پیش‌نویس' },
  { value: 'SCHEDULED', label: 'برنامه‌ریزی‌شده' }
];

const LANGUAGE_OPTIONS: { value: 'all' | Lang; label: string }[] = [
  { value: 'all', label: 'همه زبان‌ها' },
  { value: 'FA', label: 'فارسی' },
  { value: 'EN', label: 'انگلیسی' }
];

const DEFAULT_PAGE_SIZE = 25;

function buildQueryKey(statuses: ArticleStatus[], language: 'all' | Lang, search: string, page: number) {
  return ['review-queue', statuses.slice().sort().join(','), language, search.trim(), page];
}

function getLocalizedSummary(article: ReviewQueueSnapshot['articles'][number]) {
  if (article.language === 'FA') {
    return article.summaryFa ?? article.summaryEn ?? '';
  }
  return article.summaryEn ?? article.summaryFa ?? '';
}

type ReviewQueueProps = {
  initialSnapshot: ReviewQueueSnapshot;
};

export default function ReviewQueue({ initialSnapshot }: ReviewQueueProps) {
  const queryClient = useQueryClient();
  const [statusFilters, setStatusFilters] = useState<ArticleStatus[]>(['REVIEWED', 'DRAFT']);
  const [languageFilter, setLanguageFilter] = useState<'all' | Lang>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [page, setPage] = useState(initialSnapshot.pagination.page);

  const pageSize = initialSnapshot.pagination.pageSize ?? DEFAULT_PAGE_SIZE;

  const queryKey = useMemo(() => buildQueryKey(statusFilters, languageFilter, searchValue, page), [
    statusFilters,
    languageFilter,
    searchValue,
    page
  ]);

  const returnParams = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilters.length) {
      params.set('status', statusFilters.join(','));
    }
    if (languageFilter !== 'all') {
      params.set('language', languageFilter);
    }
    if (searchValue.trim()) {
      params.set('search', searchValue.trim());
    }
    return params.toString();
  }, [languageFilter, searchValue, statusFilters]);

  const returnPath = returnParams ? `/admin?${returnParams}` : '/admin';

  const query = useQuery<ReviewQueueSnapshot>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (statusFilters.length) {
        params.set('status', statusFilters.join(','));
      }
      if (languageFilter !== 'all') {
        params.set('language', languageFilter);
      }
      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      }
      const response = await fetch(`/api/admin/articles/pending?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load review queue');
      }
      return (await response.json()) as ReviewQueueSnapshot;
    },
    initialData: initialSnapshot,
    refetchInterval: 60000
  });

  const snapshot = query.data ?? initialSnapshot;
  const articles = snapshot.articles;
  const stats = snapshot.stats;
  const pagination = snapshot.pagination;

  useEffect(() => {
    setPage((current) => (current === 1 ? current : 1));
  }, [languageFilter, statusFilters, searchValue]);

  async function updateStatus(id: string, status: ArticleStatus) {
    setPendingId(id);
    try {
      const response = await fetch(`/api/admin/articles/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error('failed');
      }
      await queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      console.error('Failed to update status', error);
    } finally {
      setPendingId(null);
    }
  }

  function toggleStatus(value: ArticleStatus) {
    setStatusFilters((current) => {
      const exists = current.includes(value);
      const next = exists ? current.filter((status) => status !== value) : [...current, value];
      return next.length ? next : ['REVIEWED'];
    });
    setPage(1);
  }

  const filteredStatuses = statusFilters.join(',');
  const isFetching = query.isFetching && !query.isLoading;
  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPreviousPage = pagination.page > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {REVIEW_STATUS_OPTIONS.map((option) => {
            const active = statusFilters.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleStatus(option.value)}
                className={clsx(
                  'rounded-full border px-4 py-1 text-xs font-medium transition',
                  active
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                    : 'border-slate-700/60 text-slate-300 hover:border-slate-500'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-xs text-slate-200"
            value={languageFilter}
            onChange={(event) => {
              setLanguageFilter(event.target.value as 'all' | Lang);
              setPage(1);
            }}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearchValue(searchInput.trim());
            }}
          >
            <input
              type="search"
              placeholder="جستجو در عنوان یا منبع"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-48 rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-white hover:bg-sky-400"
            >
              جستجو
            </button>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 text-xs text-slate-300">
        <span>در انتظار بازبینی: <strong className="text-emerald-300">{stats.pendingReview}</strong></span>
        <span>پیش‌نویس‌ها: <strong className="text-slate-100">{stats.draft}</strong></span>
        <span>برنامه‌ریزی شده: <strong className="text-slate-100">{stats.scheduled}</strong></span>
        {isFetching && <span className="text-sky-300">در حال بروزرسانی…</span>}
      </div>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-8 text-center text-sm text-slate-400">
          خبری برای بازبینی در این فیلترها وجود ندارد.
        </div>
      ) : (
        <div className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800">
          {articles.map((article) => {
            const translationMeta = parseFaTranslationMeta(article.faTranslationMeta ?? null);
            const needsTranslation =
              translationMeta.title.status === 'fallback' || translationMeta.content.status === 'fallback';
            const summary = getLocalizedSummary(article);
            const publishedLabel = article.publishedAt
              ? formatJalaliDateTime(article.publishedAt, 'YYYY/MM/DD HH:mm')
              : formatJalaliDateTime(article.updatedAt, 'YYYY/MM/DD HH:mm');
            const updatedLabel = formatJalaliDateTime(article.updatedAt, 'YYYY/MM/DD HH:mm');
            const statusLabel = REVIEW_STATUS_OPTIONS.find((item) => item.value === article.status)?.label ?? article.status;
            return (
              <article
                key={article.id}
                className="flex flex-col gap-4 bg-slate-900/60 p-6 md:flex-row md:items-start md:justify-between"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-slate-700/60 px-3 py-1 text-slate-200">{statusLabel}</span>
                    <span className="rounded-full border border-slate-700/60 px-3 py-1 text-slate-200">
                      {article.language === 'FA' ? 'FA' : 'EN'}
                    </span>
                    {article.newsSource?.name ? (
                      <span>منبع: {article.newsSource.name}</span>
                    ) : (
                      <span>منبع نامشخص</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-100">
                      {article.titleFa || article.titleEn || 'بدون عنوان'}
                    </p>
                    {needsTranslation ? (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[0.7rem] text-amber-200">
                        ترجمه نشده
                      </span>
                    ) : null}
                  </div>
                  {summary && <p className="text-sm text-slate-400 line-clamp-3">{summary}</p>}
                  <p className="text-xs text-slate-500">انتشار اولیه: {publishedLabel}</p>
                  <p className="text-xs text-slate-500">آخرین بروزرسانی: {updatedLabel}</p>
                  <Link
                    href={`/admin/articles/${article.id}?returnTo=${encodeURIComponent(returnPath)}&source=review`}
                    className="inline-flex items-center text-xs font-medium text-sky-300 hover:text-sky-200"
                  >
                    ویرایش و بررسی کامل ↗
                  </Link>
                </div>
                <div className="flex flex-col gap-3 md:w-48">
                  <button
                    type="button"
                    onClick={() => updateStatus(article.id, 'PUBLISHED')}
                    disabled={pendingId === article.id}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    تأیید و انتشار
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(article.id, 'REJECTED')}
                    disabled={pendingId === article.id}
                    className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    رد خبر
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <footer className="flex flex-col gap-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
        <span>
          فیلترهای فعال: وضعیت ({filteredStatuses || '---'}) · زبان ({languageFilter})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!hasPreviousPage || query.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            قبلی
          </button>
          <span>
            صفحه {pagination.page} از {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={!hasNextPage || query.isFetching}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            بعدی
          </button>
        </div>
      </footer>
    </div>
  );
}
