'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import type { IngestionStatus } from '@prisma/client';
import { SOURCE_FAILURE_THRESHOLD } from '@/lib/constants';
import { formatJalaliDateTime } from '@/lib/time/jalali';

export type AdminNewsSource = {
  id: string;
  name: string;
  homepageUrl: string;
  rssUrl: string | null;
  scrapeUrl: string | null;
  language: string;
  region: string | null;
  topicTags: string[];
  enabled: boolean;
  isTrusted: boolean;
  blacklisted: boolean;
  priority: number;
  notes: string | null;
  lastStatus: IngestionStatus;
  lastStatusCode: number | null;
  lastErrorMessage: string | null;
  lastFetchAt: string | null;
  lastSuccessAt: string | null;
  failureCount: number;
};

export type SourceSummary = {
  total: number;
  enabled: number;
  ok: number;
  error: number;
  unknown: number;
};

export type SourceFailure = {
  id: string;
  name: string;
  homepageUrl: string;
  lastStatusCode: number | null;
  lastErrorMessage: string | null;
  lastFetchAt: string | null;
};

type SourceManagerProps = {
  initialSources: AdminNewsSource[];
  initialPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  initialSummary: SourceSummary;
  recentFailures: SourceFailure[];
};

type SourceListResponse = {
  sources: AdminNewsSource[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: SourceSummary;
  recentFailures: SourceFailure[];
};

const STATUS_LABELS: Record<IngestionStatus, string> = {
  OK: 'موفق',
  ERROR: 'خطا',
  UNKNOWN: 'نامشخص'
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return formatJalaliDateTime(value, 'YYYY/MM/DD HH:mm');
}

type SourceRowProps = {
  source: AdminNewsSource;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggle: (field: 'enabled' | 'isTrusted' | 'blacklisted', value: boolean) => Promise<void>;
  onPriorityChange: (value: number) => Promise<void>;
  onSaveDetails: (details: { rssUrl: string; scrapeUrl: string; language: string; region: string; topicTags: string; notes: string }) => Promise<void>;
};

function SourceRow({ source, isEditing, onToggleEdit, onToggle, onPriorityChange, onSaveDetails }: SourceRowProps) {
  const [rssValue, setRssValue] = useState(source.rssUrl ?? '');
  const [scrapeValue, setScrapeValue] = useState(source.scrapeUrl ?? '');
  const [languageValue, setLanguageValue] = useState(source.language);
  const [regionValue, setRegionValue] = useState(source.region ?? '');
  const [tagsValue, setTagsValue] = useState(source.topicTags.join(', '));
  const [notesValue, setNotesValue] = useState(source.notes ?? '');

  useEffect(() => {
    if (isEditing) {
      setRssValue(source.rssUrl ?? '');
      setScrapeValue(source.scrapeUrl ?? '');
      setLanguageValue(source.language);
      setRegionValue(source.region ?? '');
      setTagsValue(source.topicTags.join(', '));
      setNotesValue(source.notes ?? '');
    }
  }, [isEditing, source]);

  return (
    <tr className="align-top hover:bg-slate-900/60">
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100">{source.name}</span>
            <span className={clsx('rounded-full px-2 py-0.5 text-[11px]', {
              'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40': source.lastStatus === 'OK',
              'bg-rose-500/10 text-rose-300 border border-rose-500/40': source.lastStatus === 'ERROR',
              'bg-slate-500/10 text-slate-200 border border-slate-500/30': source.lastStatus === 'UNKNOWN'
            })}
            >
              {STATUS_LABELS[source.lastStatus]}
            </span>
          </div>
          <a
            className="text-xs text-sky-400 hover:text-sky-200"
            href={source.homepageUrl}
            target="_blank"
            rel="noreferrer"
          >
            {source.homepageUrl}
          </a>
          <p className="text-[11px] text-slate-500">
            زبان: <span className="font-medium text-slate-300">{source.language.toUpperCase()}</span>
            {source.region ? ` • منطقه: ${source.region}` : ''}
          </p>
          {source.notes ? <p className="text-[11px] text-slate-400">{source.notes}</p> : null}
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="flex flex-col items-center gap-2 text-xs text-slate-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={source.enabled}
              onChange={(event) => onToggle('enabled', event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
            />
            فعال
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={source.isTrusted}
              onChange={(event) => onToggle('isTrusted', event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-400 focus:ring-sky-300"
            />
            معتبر
          </label>
          <label className="flex items-center gap-2 text-rose-300">
            <input
              type="checkbox"
              checked={source.blacklisted}
              onChange={(event) => onToggle('blacklisted', event.target.checked)}
              className="h-4 w-4 rounded border-rose-500 bg-slate-800 text-rose-500 focus:ring-rose-400"
            />
            بلاک‌لیست
          </label>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <p className="text-xs text-slate-300">
          {source.topicTags.length > 0 ? source.topicTags.join(', ') : '—'}
        </p>
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-400">
          اولویت:
          <input
            type="number"
            value={source.priority}
            min={1}
            max={99}
            onChange={(event) => onPriorityChange(Number(event.target.value))}
            className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-slate-100"
          />
        </label>
      </td>
      <td className="px-4 py-4 text-center text-xs text-slate-400">
        <p>{formatDate(source.lastFetchAt)}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {source.lastStatusCode ? `کد ${source.lastStatusCode}` : 'کد نامشخص'}
        </p>
        <p className="mt-1 text-[11px] text-rose-400">
          خطاهای پیاپی: {source.failureCount}
          <span className="text-[10px] text-slate-500"> (حد آستانه {SOURCE_FAILURE_THRESHOLD})</span>
        </p>
        {source.lastSuccessAt ? (
          <p className="mt-1 text-[11px] text-slate-500">
            آخرین موفقیت: {formatDate(source.lastSuccessAt)}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-4 text-center">
        <button
          type="button"
          onClick={onToggleEdit}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          {isEditing ? 'بستن' : 'ویرایش جزئیات'}
        </button>
        {isEditing ? (
          <div className="mt-3 space-y-3 rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-right text-xs">
            <label className="flex flex-col gap-1">
              RSS / Atom
              <input
                value={rssValue}
                onChange={(event) => setRssValue(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                placeholder="https://example.com/feed"
              />
            </label>
            <label className="flex flex-col gap-1">
              صفحه HTML برای خزش
              <input
                value={scrapeValue}
                onChange={(event) => setScrapeValue(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                placeholder="https://example.com/news"
              />
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                زبان
                <input
                  value={languageValue}
                  onChange={(event) => setLanguageValue(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1">
                منطقه
                <input
                  value={regionValue}
                  onChange={(event) => setRegionValue(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              برچسب‌ها (با کاما جدا کنید)
              <input
                value={tagsValue}
                onChange={(event) => setTagsValue(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              توضیحات / یادداشت داخلی
              <textarea
                value={notesValue}
                onChange={(event) => setNotesValue(event.target.value)}
                rows={3}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onToggleEdit}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() =>
                  onSaveDetails({
                    rssUrl: rssValue,
                    scrapeUrl: scrapeValue,
                    language: languageValue,
                    region: regionValue,
                    topicTags: tagsValue,
                    notes: notesValue
                  })
                }
                className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-400"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export default function SourceManager({
  initialSources,
  initialPagination,
  initialSummary,
  recentFailures
}: SourceManagerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IngestionStatus>('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [page, setPage] = useState(initialPagination.page);

  const pageSize = initialPagination.pageSize;

  useEffect(() => {
    setPage((current) => (current === 1 ? current : 1));
  }, [search, statusFilter, enabledFilter]);

  const queryKey = useMemo(
    () => [
      'admin-sources',
      {
        page,
        pageSize,
        search: search.trim(),
        status: statusFilter,
        enabled: enabledFilter
      }
    ],
    [page, pageSize, search, statusFilter, enabledFilter]
  );

  const query = useQuery<SourceListResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });
      if (search.trim()) {
        params.set('search', search.trim());
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (enabledFilter !== 'all') {
        params.set('enabled', enabledFilter);
      }
      const response = await fetch(`/api/admin/sources?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load sources');
      }
      const payload = (await response.json()) as SourceListResponse;
      return payload;
    },
    initialData: {
      sources: initialSources,
      pagination: initialPagination,
      summary: initialSummary,
      recentFailures
    }
  });

  const sources = query.data?.sources ?? initialSources;
  const pagination = query.data?.pagination ?? initialPagination;
  const summary = query.data?.summary ?? initialSummary;
  const latestFailures = query.data?.recentFailures ?? recentFailures;

  async function mutateSource(id: string, payload: Record<string, unknown>) {
    setFormError(null);
    setIsMutating(true);
    try {
      const response = await fetch(`/api/admin/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('Request failed');
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-sources'] });
    } catch (error) {
      console.error(error);
      setFormError('به‌روزرسانی منبع با خطا مواجه شد.');
      await queryClient.invalidateQueries({ queryKey: ['admin-sources'] });
    } finally {
      setIsMutating(false);
    }
  }

  const handleToggle = (id: string, field: 'enabled' | 'isTrusted' | 'blacklisted', value: boolean) =>
    mutateSource(id, { [field]: value });

  const handlePriorityChange = (id: string, value: number) => mutateSource(id, { priority: value });

  const handleSaveDetails = (
    id: string,
    details: { rssUrl: string; scrapeUrl: string; language: string; region: string; topicTags: string; notes: string }
  ) =>
    mutateSource(id, {
      rssUrl: details.rssUrl || null,
      scrapeUrl: details.scrapeUrl || null,
      language: details.language,
      region: details.region || null,
      topicTags: details.topicTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: details.notes || null
    });

  const isFetching = query.isFetching && !query.isLoading;
  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-slate-100 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">مجموع منابع</p>
          <p className="mt-2 text-3xl font-bold">{summary.total}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">فعال</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{summary.enabled}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">وضعیت موفق</p>
          <p className="mt-2 text-3xl font-bold text-sky-300">{summary.ok}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">خطا</p>
          <p className="mt-2 text-3xl font-bold text-rose-300">{summary.error}</p>
        </div>
      </section>

      {latestFailures.length > 0 ? (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-4 text-sm text-rose-100">
          <h2 className="text-base font-semibold">آخرین خطاهای جمع‌آوری</h2>
          <ul className="mt-3 space-y-2">
            {latestFailures.map((failure) => (
              <li key={failure.id} className="flex flex-col gap-1 rounded-xl border border-rose-500/20 bg-rose-900/20 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{failure.name}</span>
                  <span className="text-rose-200/70">{formatDate(failure.lastFetchAt)}</span>
                </div>
                <a
                  className="text-[11px] text-rose-200/80 underline decoration-dotted"
                  href={failure.homepageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {failure.homepageUrl}
                </a>
                <p className="text-[11px] text-rose-100/70">
                  {failure.lastStatusCode ? `کد خطا: ${failure.lastStatusCode} – ` : ''}
                  {failure.lastErrorMessage ?? 'جزئیات خطا ثبت نشده است'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجو بر اساس نام، نشانی یا برچسب"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 md:w-72"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | IngestionStatus)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          >
            <option value="all">تمام وضعیت‌ها</option>
            <option value="OK">فقط موفق</option>
            <option value="ERROR">فقط خطا</option>
            <option value="UNKNOWN">نامشخص</option>
          </select>
          <select
            value={enabledFilter}
            onChange={(event) => setEnabledFilter(event.target.value as 'all' | 'enabled' | 'disabled')}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          >
            <option value="all">همه منابع</option>
            <option value="enabled">فقط فعال</option>
            <option value="disabled">فقط غیرفعال</option>
          </select>
        </div>
        {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
        {isMutating || isFetching ? <p className="text-xs text-slate-400">در حال بروزرسانی…</p> : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 bg-slate-950/40 text-sm text-slate-200">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="px-4 py-3 text-right">منبع</th>
                <th className="px-4 py-3 text-center">وضعیت</th>
                <th className="px-4 py-3 text-center">برچسب‌ها</th>
                <th className="px-4 py-3 text-center">آخرین جمع‌آوری</th>
                <th className="px-4 py-3 text-center">تنظیمات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sources.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  isEditing={editingId === source.id}
                  onToggleEdit={() => setEditingId((current) => (current === source.id ? null : source.id))}
                  onToggle={(field, value) => handleToggle(source.id, field, value)}
                  onPriorityChange={(value) => handlePriorityChange(source.id, value)}
                  onSaveDetails={(details) => handleSaveDetails(source.id, details)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {sources.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">منبعی مطابق با فیلترهای انتخابی یافت نشد.</p>
        ) : (
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
            <span>
              نمایش {sources.length} منبع از {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-lg border border-slate-700 px-3 py-1 text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                قبلی
              </button>
              <span>
                صفحه {currentPage} از {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="rounded-lg border border-slate-700 px-3 py-1 text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
