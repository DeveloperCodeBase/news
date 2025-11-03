import MonitoringDashboard from '@/components/admin/monitoring-dashboard';
import { prisma } from '@/lib/db/client';

export default async function MonitoringPage() {
  const [heartbeats, queueSnapshots, alerts] = await Promise.all([
    prisma.cronHeartbeat.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.queueSnapshot.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.alertEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 15 })
  ]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-100">مانیتورینگ لحظه‌ای</h1>
        <p className="text-slate-400">
          وضعیت صف‌ها، کران‌ها و هشدارها به‌روزرسانی لحظه‌ای برای اطمینان از انتشار بدون خطا.
        </p>
      </header>
      <MonitoringDashboard initialData={{ heartbeats, queueSnapshots, alerts }} />
    </section>
  );
}
