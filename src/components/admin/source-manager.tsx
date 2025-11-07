'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { IngestionStatus } from '@prisma/client';

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
  initialSummary: SourceSummary;
  recentFailures: SourceFailure[];
};

const STATUS_LABELS: Record<IngestionStatus, string> = {
  OK: 'موفق',
  ERROR: 'خطا',
  UNKNOWN: 'نامشخص'
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
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

export default function SourceManager({ initialSources, initialSummary, recentFailures }: SourceManagerProps) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [summary] = useState(initialSummary);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IngestionStatus>('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredSources = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sources.filter((source) => {
      const matchesSearch =
        term.length === 0 ||
        source.name.toLowerCase().includes(term) ||
        source.homepageUrl.toLowerCase().includes(term) ||
        source.topicTags.some((tag) => tag.toLowerCase().includes(term));
      if (!matchesSearch) return false;
      if (statusFilter !== 'all' && source.lastStatus !== statusFilter) return false;
      if (enabledFilter === 'enabled' && !source.enabled) return false;
      if (enabledFilter === 'disabled' && source.enabled) return false;
      return true;
    });
  }, [sources, search, statusFilter, enabledFilter]);

  async function mutateSource(id: string, payload: Record<string, unknown>) {
    setFormError(null);
    setSources((current) => current.map((item) => (item.id === id ? { ...item, ...payload } : item)));
    try {
      const response = await fetch(`/api/admin/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('Request failed');
      }
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      setFormError('به‌روزرسانی منبع با خطا مواجه شد.');
      startTransition(() => router.refresh());
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

      {recentFailures.length > 0 ? (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-4 text-sm text-rose-100">
          <h2 className="text-base font-semibold">آخرین خطاهای جمع‌آوری</h2>
          <ul className="mt-3 space-y-2">
            {recentFailures.map((failure) => (
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
        {isPending ? <p className="text-xs text-slate-400">در حال بروزرسانی…</p> : null}
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
              {filteredSources.map((source) => (
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
        {filteredSources.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">منبعی مطابق با فیلترهای انتخابی یافت نشد.</p>
        ) : null}
      </div>
    </div>
  );
}
