'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

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

type MonitoringData = {
  heartbeats: CronHeartbeat[];
  queueSnapshots: QueueSnapshot[];
  alerts: AlertEvent[];
};

function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export default function MonitoringDashboard({ initialData }: { initialData: MonitoringData }) {
  const query = useQuery<MonitoringData>({
    queryKey: ['monitoring'],
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

  const data = query.data ?? initialData;

  const latestQueues = useMemo(() => {
    const map = new Map<string, QueueSnapshot>();
    for (const snapshot of data.queueSnapshots) {
      if (!map.has(snapshot.queue)) {
        map.set(snapshot.queue, snapshot);
      }
    }
    return Array.from(map.values());
  }, [data.queueSnapshots]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
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
              <p className="mt-3 text-[11px] text-slate-500">آخرین بروزرسانی: {formatDate(queue.createdAt)}</p>
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
            {data.heartbeats.map((heartbeat) => (
              <div key={heartbeat.id} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-100">{heartbeat.job}</p>
                  <p className="text-xs text-slate-500">{formatDate(heartbeat.startedAt)}</p>
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
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">هشدارها و پیام‌ها</h2>
            <span className="text-xs text-slate-500">آخرین ۱۵ رویداد</span>
          </div>
          <div className="mt-4 space-y-3">
            {data.alerts.map((alert) => (
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
                  <span className="text-[11px] text-slate-500">{formatDate(alert.createdAt)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{alert.message}</p>
              </div>
            ))}
            {data.alerts.length === 0 && <p className="text-xs text-slate-500">هشدار فعالی وجود ندارد.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
