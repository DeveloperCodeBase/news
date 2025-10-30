import {
  getArticleAnalyticsSummary,
  getCoreWebVitalSummary,
  getTrendHighlights,
  getExperimentSummaries
} from '@/lib/db/articles';

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
  const [summary, vitals, trends, experiments] = await Promise.all([
    getArticleAnalyticsSummary(),
    getCoreWebVitalSummary(),
    getTrendHighlights(),
    getExperimentSummaries()
  ]);
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
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <h3 className="text-lg font-semibold text-slate-100">ترند موضوعی</h3>
          {trends ? (
            <ul className="space-y-2 text-sm text-slate-200">
              {trends.topics.map((topic) => (
                <li key={topic.id} className="flex items-center justify-between rounded-xl border border-slate-800/50 bg-slate-900/60 px-4 py-3">
                  <span className="font-medium text-slate-100">{topic.topic}</span>
                  <span className="text-xs text-slate-400">
                    امتیاز {topic.score.toFixed(2)} · {topic.articleCount} خبر
                  </span>
                </li>
              ))}
              <li className="text-xs text-slate-500">
                آخرین بروزرسانی: {new Date(trends.generatedAt).toLocaleString('fa-IR')}
              </li>
            </ul>
          ) : (
            <p className="text-sm text-slate-400">داده‌ای برای تحلیل ترند ثبت نشده است.</p>
          )}
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Core Web Vitals</h3>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
              <thead className="bg-slate-900/70">
                <tr>
                  <th className="px-4 py-2 text-right font-medium">شاخص</th>
                  <th className="px-4 py-2 text-center font-medium">کیفیت</th>
                  <th className="px-4 py-2 text-center font-medium">میانگین</th>
                  <th className="px-4 py-2 text-center font-medium">نمونه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {vitals.grouped.map((row) => (
                  <tr key={`${row.metric}-${row.rating}`}>
                    <td className="px-4 py-2 text-right">{row.metric}</td>
                    <td className="px-4 py-2 text-center">{row.rating}</td>
                    <td className="px-4 py-2 text-center">{(row._avg.value ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">{row._count._all}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-slate-500">
            آخرین اندازه‌گیری در {vitals.latest[0] ? new Date(vitals.latest[0].createdAt).toLocaleString('fa-IR') : '—'}
          </div>
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">آزمایش‌های A/B</h3>
        {experiments.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {experiments.map((experiment) => (
              <div key={experiment.key} className="space-y-3 rounded-xl border border-slate-800/60 bg-slate-900/60 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{experiment.name}</p>
                  <p className="text-xs text-slate-500">وضعیت: {experiment.status}</p>
                </div>
                <ul className="space-y-2 text-xs text-slate-200">
                  {experiment.variants.map((variant) => (
                    <li key={variant.key} className="rounded-lg border border-slate-800/50 bg-slate-950/60 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-100">{variant.label}</span>
                        <span className="text-slate-400">{variant.assignments} تخصیص</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-slate-300">
                        {Object.entries(variant.metrics).map(([metric, value]) => (
                          <span key={metric} className="rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-200">
                            {metric}: {value.toFixed(2)}
                          </span>
                        ))}
                        {Object.keys(variant.metrics).length === 0 ? (
                          <span className="col-span-2 text-slate-500">هنوز داده‌ای ثبت نشده است.</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">هیچ آزمایشی فعال نیست.</p>
        )}
      </section>
    </section>
  );
}
