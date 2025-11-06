import MonitoringDashboard from '@/components/admin/monitoring-dashboard';
import { getMonitoringSnapshot } from '@/lib/monitoring/snapshot';

export const dynamic = 'force-dynamic';

export default async function MonitoringPage() {
  const snapshot = await getMonitoringSnapshot();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-100">مانیتورینگ لحظه‌ای</h1>
        <p className="text-slate-400">
          وضعیت صف‌ها، کران‌ها و هشدارها به‌روزرسانی لحظه‌ای برای اطمینان از انتشار بدون خطا.
        </p>
      </header>
      <MonitoringDashboard initialData={snapshot} />
    </section>
  );
}
