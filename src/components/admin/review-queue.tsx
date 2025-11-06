'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import type { Lang } from '@prisma/client';
import type { ReviewQueueSnapshot } from '@/lib/db/articles';
import type { ArticleStatus } from '@/lib/news/status';

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

const DEFAULT_LIMIT = 25;

function buildQueryKey(statuses: ArticleStatus[], language: 'all' | Lang, search: string) {
  return ['review-queue', statuses.slice().sort().join(','), language, search.trim()];
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

  const queryKey = useMemo(() => buildQueryKey(statusFilters, languageFilter, searchValue), [
    statusFilters,
    languageFilter,
    searchValue
  ]);

  const query = useQuery<ReviewQueueSnapshot>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', String(DEFAULT_LIMIT));
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
  }

  const filteredStatuses = statusFilters.join(',');
  const isFetching = query.isFetching && !query.isLoading;

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
            onChange={(event) => setLanguageFilter(event.target.value as 'all' | Lang)}
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
            const summary = getLocalizedSummary(article);
            const publishedLabel = new Date(article.publishedAt).toLocaleString('fa-IR');
            const updatedLabel = new Date(article.updatedAt).toLocaleString('fa-IR');
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
                    {article.source?.name ? (
                      <span>منبع: {article.source.name}</span>
                    ) : (
                      <span>منبع نامشخص</span>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-slate-100">
                    {article.titleFa || article.titleEn || 'بدون عنوان'}
                  </p>
                  {summary && <p className="text-sm text-slate-400 line-clamp-3">{summary}</p>}
                  <p className="text-xs text-slate-500">انتشار اولیه: {publishedLabel}</p>
                  <p className="text-xs text-slate-500">آخرین بروزرسانی: {updatedLabel}</p>
                  <Link
                    href={`/admin/articles/${article.id}`}
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

      <footer className="text-xs text-slate-500">
        فیلترهای فعال: وضعیت ({filteredStatuses || '---'}) · زبان ({languageFilter})
      </footer>
    </div>
  );
}
