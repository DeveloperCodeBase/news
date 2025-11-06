'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export type AdminSource = {
  id: string;
  name: string;
  url: string;
  feedUrl: string;
  isTrusted: boolean;
  active: boolean;
  blacklisted: boolean;
  priority: number;
  notes?: string | null;
  lastFetchedAt?: string | null;
};

type SourceManagerProps = {
  initialSources: AdminSource[];
};

export default function SourceManager({ initialSources }: SourceManagerProps) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: '',
    url: '',
    feedUrl: '',
    isTrusted: true,
    priority: 10
  });
  const [error, setError] = useState<string | null>(null);

  async function mutateSource(id: string, payload: Partial<AdminSource>) {
    setSources((current) =>
      current.map((source) => (source.id === id ? { ...source, ...payload } : source))
    );
    const response = await fetch(`/api/admin/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setError('عدم امکان به‌روزرسانی منبع.');
      router.refresh();
      return;
    }
    startTransition(() => router.refresh());
  }

  async function handleCreateSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (!response.ok) {
      setError('ثبت منبع جدید با خطا مواجه شد.');
      return;
    }
    setForm({ name: '', url: '', feedUrl: '', isTrusted: true, priority: 10 });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreateSource}
        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-inner shadow-slate-950/30"
      >
        <h2 className="text-lg font-semibold text-slate-100">افزودن منبع جدید</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-300">
            نام
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            وب‌سایت
            <input
              value={form.url}
              onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-300 md:col-span-2">
            آدرس RSS/Atom
            <input
              value={form.feedUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, feedUrl: event.target.value }))}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.isTrusted}
              onChange={(event) => setForm((prev) => ({ ...prev, isTrusted: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
            />
            منبع معتبر (انتشار خودکار)
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            اولویت
            <input
              type="number"
              value={form.priority}
              min={1}
              max={99}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
        >
          افزودن منبع
        </button>
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 bg-slate-950/40 text-sm text-slate-200">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-4 py-3 text-right font-medium">نام</th>
              <th className="px-4 py-3 text-center font-medium">وضعیت</th>
              <th className="px-4 py-3 text-center font-medium">اولویت</th>
              <th className="px-4 py-3 text-center font-medium">آخرین جمع‌آوری</th>
              <th className="px-4 py-3 text-center font-medium">تنظیمات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sources.map((source) => (
              <tr key={source.id} className="hover:bg-slate-900/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-100">{source.name}</p>
                  <a
                    className="text-xs text-sky-400 hover:text-sky-200"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.url}
                  </a>
                  <p className="text-xs text-slate-500">{source.feedUrl}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-2 text-xs text-slate-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={source.active}
                        onChange={(event) => mutateSource(source.id, { active: event.target.checked })}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                      />
                      فعال
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={source.isTrusted}
                        onChange={(event) => mutateSource(source.id, { isTrusted: event.target.checked })}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                      />
                      معتبر
                    </label>
                    <label className="flex items-center gap-2 text-rose-300">
                      <input
                        type="checkbox"
                        checked={source.blacklisted}
                        onChange={(event) => mutateSource(source.id, { blacklisted: event.target.checked })}
                        className="h-4 w-4 rounded border-rose-500 bg-slate-800 text-rose-500 focus:ring-rose-400"
                      />
                      بلاک‌لیست
                    </label>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    value={source.priority}
                    min={1}
                    max={99}
                    onChange={(event) => mutateSource(source.id, { priority: Number(event.target.value) })}
                    className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-slate-100"
                  />
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-400">
                  {source.lastFetchedAt ? new Date(source.lastFetchedAt).toLocaleString('fa-IR') : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <textarea
                    defaultValue={source.notes ?? ''}
                    placeholder="یادداشت داخلی"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                    onBlur={(event) => mutateSource(source.id, { notes: event.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
      {isPending ? <p className="text-xs text-slate-400">در حال به‌روزرسانی…</p> : null}
    </div>
  );
}
