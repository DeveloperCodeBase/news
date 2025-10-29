import SourceManager from '@/components/admin/source-manager';
import { getAdminSources } from '@/lib/db/sources';

export const dynamic = 'force-dynamic';

export default async function SourcesPage() {
  const sources = await getAdminSources();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">مدیریت منابع خبری</h1>
        <p className="text-slate-400">افزودن، توقف یا بلاک منابع برای حفظ دقت و سرعت پایپلاین.</p>
      </header>
      <SourceManager
        initialSources={sources.map((source) => ({
          ...source,
          lastFetchedAt: source.lastFetchedAt ? source.lastFetchedAt.toISOString() : null
        }))}
      />
    </section>
  );
}
