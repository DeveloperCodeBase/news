import Link from 'next/link';
import { getScheduledArticles } from '@/lib/db/articles';
import { formatJalaliDateTime } from '@/lib/time/jalali';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const scheduled = await getScheduledArticles();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">زمان‌بندی انتشار</h1>
        <p className="text-slate-400">کنترل انتشار مرحله‌ای اخبار و هماهنگی با کمپین‌های سئو.</p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 bg-slate-950/40 text-sm text-slate-200">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-4 py-3 text-right font-medium">خبر</th>
              <th className="px-4 py-3 text-center font-medium">منبع</th>
              <th className="px-4 py-3 text-center font-medium">زمان انتشار</th>
              <th className="px-4 py-3 text-center font-medium">ویرایش</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {scheduled.map((article) => (
              <tr key={article.id} className="hover:bg-slate-900/60">
                <td className="px-4 py-3 text-right">
                  <p className="font-medium text-slate-100">{article.titleFa ?? article.titleEn}</p>
                  <p className="text-xs text-slate-500">/{article.slug}</p>
                </td>
                <td className="px-4 py-3 text-center text-slate-300">{article.newsSource?.name ?? '—'}</td>
                <td className="px-4 py-3 text-center text-slate-200">
                  {formatJalaliDateTime(article.scheduledFor)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/admin/articles/${article.id}?returnTo=${encodeURIComponent('/admin/schedule')}&source=schedule`}
                    className="rounded-lg border border-emerald-500 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
                  >
                    مدیریت
                  </Link>
                </td>
              </tr>
            ))}
            {scheduled.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={4}>
                  خبری برای انتشار زمان‌بندی نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
