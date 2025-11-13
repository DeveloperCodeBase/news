'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

type SortField = ReviewQueueSnapshot['sort']['field'];
type SortDirection = ReviewQueueSnapshot['sort']['direction'];

const SORTABLE_FIELDS: SortField[] = [
  'createdAt',
  'updatedAt',
  'publishedAt',
  'source',
  'language',
  'status',
  'category',
  'topic',
  'aiScore'
];

function ensureSortField(value: string | null, fallback: SortField): SortField {
  if (!value) return fallback;
  return SORTABLE_FIELDS.includes(value as SortField) ? (value as SortField) : fallback;
}

function ensureSortDirection(value: string | null, fallback: SortDirection): SortDirection {
  if (!value) return fallback;
  return value === 'asc' ? 'asc' : value === 'desc' ? 'desc' : fallback;
}

function buildQueryKey(
  statuses: ArticleStatus[],
  language: 'all' | Lang,
  search: string,
  page: number,
  sortField: SortField,
  sortDirection: SortDirection
) {
  return [
    'review-queue',
    statuses.slice().sort().join(','),
    language,
    search.trim(),
    page,
    sortField,
    sortDirection
  ];
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
  const searchParams = useSearchParams();
  const [statusFilters, setStatusFilters] = useState<ArticleStatus[]>(['REVIEWED', 'DRAFT']);
  const [languageFilter, setLanguageFilter] = useState<'all' | Lang>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [page, setPage] = useState(initialSnapshot.pagination.page);
  const [sortField, setSortField] = useState<SortField>(() =>
    ensureSortField(searchParams?.get('sortBy'), initialSnapshot.sort.field)
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(() =>
    ensureSortDirection(searchParams?.get('sortDirection'), initialSnapshot.sort.direction)
  );

  const pageSize = initialSnapshot.pagination.pageSize ?? DEFAULT_PAGE_SIZE;

  const queryKey = useMemo(
    () => buildQueryKey(statusFilters, languageFilter, searchValue, page, sortField, sortDirection),
    [statusFilters, languageFilter, searchValue, page, sortField, sortDirection]
  );

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
    params.set('sortBy', sortField);
    params.set('sortDirection', sortDirection);
    if (page > 1) {
      params.set('page', String(page));
    }
    return params.toString();
  }, [languageFilter, page, searchValue, sortDirection, sortField, statusFilters]);

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
      params.set('sortBy', sortField);
      params.set('sortDirection', sortDirection);
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
    if (!query.data) {
      return;
    }
    const { field: nextField, direction: nextDirection } = query.data.sort;
    setSortField((current) => (current !== nextField ? nextField : current));
    setSortDirection((current) => (current !== nextDirection ? nextDirection : current));
  }, [query.data]);

  useEffect(() => {
    setPage((current) => (current === 1 ? current : 1));
  }, [languageFilter, searchValue, statusFilters]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
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
    params.set('sortBy', sortField);
    params.set('sortDirection', sortDirection);
    if (page > 1) {
      params.set('page', String(page));
    }
    const queryString = params.toString();
    const nextUrl = queryString ? `/admin?${queryString}` : '/admin';
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [languageFilter, page, searchValue, sortDirection, sortField, statusFilters]);

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

  function handleSort(field: SortField) {
    setPage(1);
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  const SortHeader = ({
    field,
    label,
    align = 'right'
  }: {
    field: SortField;
    label: string;
    align?: 'left' | 'center' | 'right';
  }) => {
    const isActive = sortField === field;
    const indicator = !isActive ? '↕' : sortDirection === 'asc' ? '↑' : '↓';
    const alignmentClass = align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right';
    const justifyClass = align === 'center' ? 'justify-center' : align === 'left' ? 'justify-start' : 'justify-end';
    const ariaSort: 'none' | 'ascending' | 'descending' = !isActive
      ? 'none'
      : sortDirection === 'asc'
        ? 'ascending'
        : 'descending';
    return (
      <th
        className={`px-3 py-2 text-xs font-medium ${alignmentClass} text-slate-300`}
        scope="col"
        aria-sort={ariaSort}
      >
        <button
          type="button"
          onClick={() => handleSort(field)}
          className={`flex w-full items-center ${justifyClass} gap-1 text-slate-200 hover:text-sky-300`}
        >
          <span>{label}</span>
          <span aria-hidden>{indicator}</span>
          <span className="sr-only">مرتب‌سازی</span>
        </button>
      </th>
    );
  };

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
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-xs">
            <thead className="bg-slate-900/70">
              <tr>
                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-slate-300">
                  عنوان و خلاصه
                </th>
                <SortHeader field="source" label="منبع" align="left" />
                <SortHeader field="language" label="زبان" align="center" />
                <SortHeader field="category" label="دسته‌بندی" align="left" />
                <SortHeader field="topic" label="موضوع برتر" align="left" />
                <SortHeader field="aiScore" label="امتیاز هوش" align="center" />
                <SortHeader field="status" label="وضعیت" />
                <SortHeader field="createdAt" label="ایجاد" />
                <SortHeader field="publishedAt" label="انتشار" />
                <SortHeader field="updatedAt" label="بروزرسانی" />
                <th scope="col" className="px-3 py-2 text-xs font-medium text-slate-300">
                  اقدامات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {articles.map((article) => {
                const translationMeta = parseFaTranslationMeta(article.faTranslationMeta ?? null);
                const needsTranslation =
                  translationMeta.title.status === 'fallback' || translationMeta.content.status === 'fallback';
                const summary = getLocalizedSummary(article);
                const statusLabel =
                  REVIEW_STATUS_OPTIONS.find((item) => item.value === article.status)?.label ?? article.status;
                const categoryNames = article.categories
                  .map((item) => item.category.nameFa ?? item.category.nameEn ?? '')
                  .filter(Boolean);
                const categoryDisplay = categoryNames.length
                  ? categoryNames.length > 2
                    ? `${categoryNames.slice(0, 2).join('، ')} و ${categoryNames.length - 2} مورد دیگر`
                    : categoryNames.join('، ')
                  : '---';
                const topTopic = article.topics[0] ?? null;
                const aiScore =
                  typeof article.aiScore === 'number'
                    ? article.aiScore.toFixed(2)
                    : topTopic
                      ? topTopic.score.toFixed(2)
                      : '---';
                const createdLabel = formatJalaliDateTime(article.createdAt, 'YYYY/MM/DD HH:mm');
                const publishedLabel = article.publishedAt
                  ? formatJalaliDateTime(article.publishedAt, 'YYYY/MM/DD HH:mm')
                  : '---';
                const updatedLabel = formatJalaliDateTime(article.updatedAt, 'YYYY/MM/DD HH:mm');
                const slugLabel =
                  article.slug.length > 24 ? `${article.slug.slice(0, 24)}…` : article.slug;
                return (
                  <tr key={article.id} className="bg-slate-900/40 hover:bg-slate-900/70">
                    <td className="max-w-xs px-3 py-3 align-top text-right text-sm text-slate-200">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-slate-100">
                            {article.titleFa || article.titleEn || 'بدون عنوان'}
                          </span>
                          {needsTranslation ? (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[0.65rem] text-amber-200">
                              ترجمه نشده
                            </span>
                          ) : null}
                        </div>
                        {summary && <p className="text-xs text-slate-400 line-clamp-3 leading-5">{summary}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-slate-500">
                          <span>شناسه: {slugLabel}</span>
                          <Link
                            href={`/admin/articles/${article.id}?returnTo=${encodeURIComponent(returnPath)}&source=review`}
                            className="text-sky-300 hover:text-sky-200"
                          >
                            ویرایش ↗
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-right text-xs text-slate-200">
                      {article.newsSource?.name ?? 'نامشخص'}
                    </td>
                    <td className="px-3 py-3 align-top text-center text-xs text-slate-200">
                      {article.language === 'FA' ? 'FA' : 'EN'}
                    </td>
                    <td className="px-3 py-3 align-top text-right text-xs text-slate-200">{categoryDisplay}</td>
                    <td className="px-3 py-3 align-top text-right text-xs text-slate-200">
                      {topTopic?.label ?? '---'}
                    </td>
                    <td className="px-3 py-3 align-top text-center text-xs text-slate-200">{aiScore}</td>
                    <td className="px-3 py-3 align-top text-right text-xs text-slate-200">{statusLabel}</td>
                    <td className="px-3 py-3 align-top text-right text-xs text-slate-300">{createdLabel}</td>
                    <td className="px-3 py-3 align-top text-right text-xs text-slate-300">{publishedLabel}</td>
                    <td className="px-3 py-3 align-top text-right text-xs text-slate-300">{updatedLabel}</td>
                    <td className="px-3 py-3 align-top text-right text-xs text-slate-200">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(article.id, 'PUBLISHED')}
                          disabled={pendingId === article.id}
                          className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          انتشار
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(article.id, 'REJECTED')}
                          disabled={pendingId === article.id}
                          className="rounded-lg bg-rose-500 px-3 py-1 text-xs font-medium text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          رد
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
