'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

type CronHeartbeat = {
  id: string;
  job: string;
  status: string;
  startedAt: string | Date;
  finishedAt: string | Date | null;
  durationMs: number | null;
  message: string | null;
  createdAt: string | Date;
};

type QueueSnapshot = {
  id: string;
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  createdAt: string | Date;
};

type AlertEvent = {
  id: string;
  channel: string;
  severity: string;
  subject: string;
  message: string;
  createdAt: string | Date;
};

type IngestionSnapshot = {
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  lastRunMetrics: {
    fetched?: number;
    created?: number;
    skipped?: number;
    pendingReview?: number;
  } | null;
  pendingReviewCount: number;
};

type NewsSourceSummary = {
  totals: {
    total: number;
    enabled: number;
    ok: number;
    error: number;
    unknown: number;
  };
  recentFailures: {
    id: string;
    name: string;
    homepageUrl: string;
    lastStatusCode: number | null;
    lastErrorMessage: string | null;
    lastFetchAt: string | null;
  }[];
};

type MonitoringData = {
  heartbeats: CronHeartbeat[];
  queueSnapshots: QueueSnapshot[];
  alerts: AlertEvent[];
  ingestion: IngestionSnapshot;
  newsSources: NewsSourceSummary;
};

const EMPTY_QUEUE_SNAPSHOTS: QueueSnapshot[] = [];
const EMPTY_HEARTBEATS: CronHeartbeat[] = [];
const EMPTY_ALERTS: AlertEvent[] = [];
const EMPTY_FAILURES: NewsSourceSummary['recentFailures'] = [];

function formatTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return 'نامشخص';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'نامشخص';
  }
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

export default function MonitoringDashboard({ initialData }: { initialData: MonitoringData }) {
  const queryKey = ['monitoring'];
  const query = useQuery<MonitoringData>({
    queryKey,
    queryFn: async () => {
      const response = await fetch('/api/admin/monitoring');
      if (!response.ok) {
        throw new Error('Failed to load monitoring data');
      }
      return (await response.json()) as MonitoringData;
    },
    initialData,
    refetchInterval: 15000
  });

  const data = query.data ?? initialData ?? null;
  const ingestion = data?.ingestion ?? {
    lastRunAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    lastRunMetrics: null,
    pendingReviewCount: 0
  };
  const newsSources = data?.newsSources ?? {
    totals: { total: 0, enabled: 0, ok: 0, error: 0, unknown: 0 },
    recentFailures: EMPTY_FAILURES
  };

  const latestQueues = useMemo(() => {
    const snapshots = data?.queueSnapshots;
    if (!snapshots || snapshots.length === 0) {
      return EMPTY_QUEUE_SNAPSHOTS;
    }
    const map = new Map<string, QueueSnapshot>();
    for (const snapshot of snapshots) {
      if (!map.has(snapshot.queue)) {
        map.set(snapshot.queue, snapshot);
      }
    }
    return Array.from(map.values());
  }, [data]);

  const heartbeats = useMemo(() => {
    const source = data?.heartbeats;
    return source && source.length ? source.slice(0, 20) : EMPTY_HEARTBEATS;
  }, [data]);

  const alerts = useMemo(() => {
    const source = data?.alerts;
    return source && source.length ? source.slice(0, 15) : EMPTY_ALERTS;
  }, [data]);

  const recentSourceFailures = useMemo(() => {
    const failures = newsSources.recentFailures;
    return failures && failures.length ? failures : EMPTY_FAILURES;
  }, [newsSources.recentFailures]);

  if (query.isError) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-950/10 p-6 text-sm text-rose-200">
        <p className="font-semibold">خطا در بارگیری داده‌های مانیتورینگ</p>
        <p className="mt-2 text-rose-100/70">لطفاً اتصال شبکه یا وضعیت سرور را بررسی کنید و سپس دوباره تلاش کنید.</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-4 inline-flex items-center rounded-lg border border-rose-400/40 px-4 py-2 text-xs font-medium text-rose-50 hover:bg-rose-500/10"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-6 text-sm text-slate-300">
        اطلاعاتی برای نمایش وجود ندارد.
      </div>
    );
  }

  const isRefreshing = query.isFetching && !query.isLoading;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
          <p className="text-xs text-slate-500">آخرین اجرای پایپلاین</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-100">{formatDateTime(ingestion.lastRunAt)}</h3>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div>
              <dt className="text-slate-500">اخبار جدید</dt>
              <dd className="text-lg font-semibold text-emerald-300">
                {ingestion.lastRunMetrics?.created ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">مجموع جمع‌آوری</dt>
              <dd className="text-lg font-semibold text-slate-100">
                {ingestion.lastRunMetrics?.fetched ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">تکراری</dt>
              <dd className="text-lg font-semibold text-amber-300">
                {ingestion.lastRunMetrics?.skipped ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">در انتظار بازبینی</dt>
              <dd className="text-lg font-semibold text-slate-100">
                {ingestion.lastRunMetrics?.pendingReview ?? ingestion.pendingReviewCount}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-slate-500">
            {isRefreshing ? 'در حال بروزرسانی داده‌ها…' : `آخرین بروزرسانی: ${formatDateTime(ingestion.lastSuccessAt)}`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
          <p className="text-xs text-slate-500">صف اخبار در انتظار تأیید</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-50">{ingestion.pendingReviewCount}</h3>
          <p className="mt-2 text-xs text-slate-400">
            مجموع مقالاتی که برای بازبینی انسانی در صف هستند.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
          <p className="text-xs text-slate-500">آخرین اجرای موفق</p>
          <h3 className="mt-2 text-base font-semibold text-slate-100">{formatDateTime(ingestion.lastSuccessAt)}</h3>
          <p className="mt-3 text-xs text-slate-500">پایپلاین هر ۱۵ دقیقه اجرا می‌شود.</p>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
          <p className="text-xs text-slate-500">آخرین خطای ثبت‌شده</p>
          {ingestion.lastErrorAt ? (
            <>
              <h3 className="mt-2 text-sm font-semibold text-rose-200">{formatDateTime(ingestion.lastErrorAt)}</h3>
              <p className="mt-2 line-clamp-3 text-xs text-rose-100/80">
                {ingestion.lastErrorMessage ?? 'خطای نامشخص'}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-emerald-200">هیچ خطای اخیر ثبت نشده است.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
          <h2 className="text-lg font-semibold text-slate-100">وضعیت منابع خبری</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div>
              <dt className="text-slate-500">کل منابع</dt>
              <dd className="text-2xl font-semibold text-slate-50">{newsSources.totals.total}</dd>
            </div>
            <div>
              <dt className="text-slate-500">فعال</dt>
              <dd className="text-2xl font-semibold text-emerald-300">{newsSources.totals.enabled}</dd>
            </div>
            <div>
              <dt className="text-slate-500">وضعیت موفق</dt>
              <dd className="text-2xl font-semibold text-sky-300">{newsSources.totals.ok}</dd>
            </div>
            <div>
              <dt className="text-slate-500">خطادار</dt>
              <dd className="text-2xl font-semibold text-rose-300">{newsSources.totals.error}</dd>
            </div>
            <div>
              <dt className="text-slate-500">نامشخص</dt>
              <dd className="text-2xl font-semibold text-amber-300">{newsSources.totals.unknown}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">آخرین خطاهای منابع</h2>
            <span className="text-xs text-slate-500">۱۰ مورد اخیر</span>
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            {recentSourceFailures.length === 0 ? (
              <p className="text-slate-500">خطایی برای منابع ثبت نشده است.</p>
            ) : (
              recentSourceFailures.map((failure) => (
                <div
                  key={failure.id}
                  className="rounded-xl border border-rose-500/30 bg-rose-950/10 px-3 py-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-rose-200">{failure.name}</span>
                    <span className="text-rose-100/70">{formatDateTime(failure.lastFetchAt)}</span>
                  </div>
                  <a
                    className="mt-1 inline-flex text-[11px] text-rose-200/80 underline decoration-dotted"
                    href={failure.homepageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {failure.homepageUrl}
                  </a>
                  <p className="mt-2 text-[11px] text-rose-100/80">
                    {failure.lastStatusCode ? `کد خطا ${failure.lastStatusCode} – ` : ''}
                    {failure.lastErrorMessage ?? 'جزئیات خطا موجود نیست'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {latestQueues.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4 text-sm text-slate-400 md:col-span-3">
            داده‌ای برای صف‌های کاری در دسترس نیست.
          </div>
        ) : null}
        {latestQueues.map((queue) => {
          const warn = queue.failed > 0 || queue.waiting > 50;
          return (
            <div
              key={queue.id}
              className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4 shadow-inner shadow-slate-900/30"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">{queue.queue}</h3>
                <span className={`rounded-full px-3 py-1 text-xs ${warn ? 'bg-rose-500/10 text-rose-200' : 'bg-emerald-500/10 text-emerald-200'}`}>
                  {warn ? 'هشدار' : 'سالم'}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <dt className="text-slate-500">در انتظار</dt>
                  <dd className="text-lg font-semibold text-slate-100">{queue.waiting}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">فعال</dt>
                  <dd className="text-lg font-semibold text-slate-100">{queue.active}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">تکمیل</dt>
                  <dd className="text-lg font-semibold text-emerald-300">{queue.completed}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">خطا</dt>
                  <dd className={`text-lg font-semibold ${queue.failed > 0 ? 'text-rose-300' : 'text-slate-100'}`}>{queue.failed}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] text-slate-500">آخرین بروزرسانی: {formatTime(queue.createdAt)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">وضعیت کران‌ها</h2>
            <span className="text-xs text-slate-500">آخرین ۲۰ اجرا</span>
          </div>
          <div className="mt-4 space-y-3">
            {heartbeats.map((heartbeat) => (
              <div
                key={heartbeat.id}
                className={clsx(
                  'flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm',
                  heartbeat.job === 'ingestion' && 'border-sky-500/40'
                )}
              >
                <div>
                  <p className="font-semibold text-slate-100">{heartbeat.job}</p>
                  <p className="text-xs text-slate-500">{formatTime(heartbeat.startedAt)}</p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      heartbeat.status === 'success'
                        ? 'text-emerald-300'
                        : heartbeat.status === 'error'
                        ? 'text-rose-300'
                        : 'text-sky-300'
                    }
                  >
                    {heartbeat.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    {heartbeat.durationMs ? `${Math.round(heartbeat.durationMs)}ms` : '---'}
                  </p>
                </div>
              </div>
            ))}
            {heartbeats.length === 0 && (
              <p className="text-xs text-slate-500">اجرای ثبت شده‌ای برای کران‌ها موجود نیست.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">هشدارها و پیام‌ها</h2>
            <span className="text-xs text-slate-500">آخرین ۱۵ رویداد</span>
          </div>
          <div className="mt-4 space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span
                    className={
                      alert.severity === 'critical'
                        ? 'text-rose-300'
                        : alert.severity === 'warning'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }
                  >
                    {alert.subject}
                  </span>
                  <span className="text-[11px] text-slate-500">{formatTime(alert.createdAt)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{alert.message}</p>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-xs text-slate-500">هشدار فعالی وجود ندارد.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
