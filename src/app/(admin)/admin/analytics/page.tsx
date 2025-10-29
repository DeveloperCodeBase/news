import { getArticleAnalyticsSummary } from '@/lib/db/articles';

export const dynamic = 'force-dynamic';

function formatDuration(ms: number) {
  if (ms <= 0) return '0 ثانیه';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  if (minutes === 0) {
    return `${seconds} ثانیه`;
  }
  return `${minutes} دقیقه و ${seconds} ثانیه`;
}

export default async function AnalyticsPage() {
  const summary = await getArticleAnalyticsSummary();
  const cards = [
    { label: 'بازدید کل', value: summary.totals.views.toLocaleString('fa-IR') },
    { label: 'بازدیدکننده یکتا', value: summary.totals.visitors.toLocaleString('fa-IR') },
    {
      label: 'میانگین زمان مطالعه',
      value: formatDuration(summary.totals.avgReadTimeMs)
    },
    {
      label: 'میانگین تکمیل مطالعه',
      value: `${Math.round(summary.totals.avgCompletion * 100)}٪`
    }
  ];

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">تحلیل بازدید و عملکرد</h1>
        <p className="text-slate-400">پایش سریع رفتار کاربران برای بهینه‌سازی محتوا و سئو.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/20"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{card.value}</p>
          </div>
        ))}
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-100">مقالات برتر</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 bg-slate-950/40 text-sm text-slate-200">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 text-right font-medium">عنوان</th>
                <th className="px-4 py-3 text-center font-medium">بازدید</th>
                <th className="px-4 py-3 text-center font-medium">بازدیدکننده یکتا</th>
                <th className="px-4 py-3 text-center font-medium">میانگین زمان</th>
                <th className="px-4 py-3 text-center font-medium">تکمیل</th>
                <th className="px-4 py-3 text-center font-medium">آخرین بازدید</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {summary.topArticles.map((article) => (
                <tr key={article.id} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 text-right">
                    <div className="font-medium text-slate-100">{article.titleFa ?? article.titleEn}</div>
                    <div className="text-xs text-slate-500">/{article.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-center">{article.analytics?.totalViews.toLocaleString('fa-IR')}</td>
                  <td className="px-4 py-3 text-center">{article.analytics?.uniqueVisitors.toLocaleString('fa-IR')}</td>
                  <td className="px-4 py-3 text-center">
                    {article.analytics ? formatDuration(article.analytics.avgReadTimeMs) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {article.analytics ? `${Math.round((article.analytics.avgCompletion ?? 0) * 100)}٪` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-400">
                    {article.analytics?.lastViewedAt
                      ? new Date(article.analytics.lastViewedAt).toLocaleString('fa-IR')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
