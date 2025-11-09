import SourceManager from '@/components/admin/source-manager';
import { getNewsSourceHealthSummary, listAdminNewsSources } from '@/lib/db/sources';

export const dynamic = 'force-dynamic';

export default async function SourcesPage() {
  const [{ sources, pagination }, summary] = await Promise.all([
    listAdminNewsSources({ page: 1, pageSize: 25 }),
    getNewsSourceHealthSummary()
  ]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">مدیریت منابع خبری</h1>
        <p className="text-slate-400">افزودن، توقف یا بلاک منابع برای حفظ دقت و سرعت پایپلاین.</p>
      </header>
      <SourceManager
        initialSummary={{
          total: summary.totals.total,
          enabled: summary.totals.enabled,
          ok: summary.totals.ok,
          error: summary.totals.error,
          unknown: summary.totals.unknown
        }}
        recentFailures={summary.recentFailures.map((failure) => ({
          id: failure.id,
          name: failure.name,
          homepageUrl: failure.homepageUrl,
          lastStatusCode: failure.lastStatusCode ?? null,
          lastErrorMessage: failure.lastErrorMessage ?? null,
          lastFetchAt: failure.lastFetchAt ? failure.lastFetchAt.toISOString() : null
        }))}
        initialSources={sources.map((source) => ({
          id: source.id,
          name: source.name,
          homepageUrl: source.homepageUrl,
          rssUrl: source.rssUrl ?? null,
          scrapeUrl: source.scrapeUrl ?? null,
          language: source.language,
          region: source.region ?? null,
          topicTags: source.topicTags,
          enabled: source.enabled,
          isTrusted: source.isTrusted,
          blacklisted: source.blacklisted,
          priority: source.priority,
          notes: source.notes ?? null,
          lastStatus: source.lastStatus,
          lastStatusCode: source.lastStatusCode ?? null,
          lastErrorMessage: source.lastErrorMessage ?? null,
          lastFetchAt: source.lastFetchAt ? source.lastFetchAt.toISOString() : null,
          lastSuccessAt: source.lastSuccessAt ? source.lastSuccessAt.toISOString() : null,
          failureCount: source.failureCount
        }))}
        initialPagination={pagination}
      />
    </section>
  );
}
