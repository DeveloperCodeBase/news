'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ARTICLE_STATUSES, type ArticleStatus } from '@/lib/news/status';

type Taxonomy = { id: string; nameFa: string | null; nameEn: string | null };

type ArticleEditorProps = {
  article: {
    id: string;
    slug: string;
    titleFa: string;
    titleEn: string | null;
    excerptFa: string | null;
    excerptEn: string | null;
    summaryFa: string | null;
    summaryEn: string | null;
    contentFa: string | null;
    contentEn: string | null;
    status: ArticleStatus;
    scheduledFor?: string | null;
    categories: { category: Taxonomy }[];
    tags: { tag: Taxonomy }[];
    coverImageUrl?: string | null;
  };
  taxonomies: {
    categories: Taxonomy[];
    tags: Taxonomy[];
  };
};

export default function ArticleEditor({ article, taxonomies }: ArticleEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ArticleStatus>(article.status);
  const [titleFa, setTitleFa] = useState<string>(article.titleFa);
  const [titleEn, setTitleEn] = useState<string>(article.titleEn ?? '');
  const [excerptFa, setExcerptFa] = useState<string>(article.excerptFa ?? '');
  const [excerptEn, setExcerptEn] = useState<string>(article.excerptEn ?? '');
  const [summaryFa, setSummaryFa] = useState<string>(
    article.summaryFa ?? article.excerptFa ?? ''
  );
  const [summaryEn, setSummaryEn] = useState<string>(
    article.summaryEn ?? article.excerptEn ?? ''
  );
  const [selectedCategories, setSelectedCategories] = useState(() =>
    article.categories.map(({ category }) => category.id)
  );
  const [selectedTags, setSelectedTags] = useState(() => article.tags.map(({ tag }) => tag.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeLocale, setActiveLocale] = useState<'fa' | 'en'>('fa');
  const [coverImageUrl, setCoverImageUrl] = useState(article.coverImageUrl ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (!article.scheduledFor) return '';
    const parsed = new Date(article.scheduledFor);
    if (Number.isNaN(parsed.getTime())) return '';
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(
      parsed.getMinutes()
    )}`;
  });

  const editorFa = useEditor({
    extensions: [StarterKit],
    content: article.contentFa ?? ''
  });

  const editorEn = useEditor({
    extensions: [StarterKit],
    content: article.contentEn ?? ''
  });

  const categories = useMemo(() => taxonomies.categories, [taxonomies.categories]);
  const tags = useMemo(() => taxonomies.tags, [taxonomies.tags]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editorFa || !editorEn) return;
    setIsSubmitting(true);

    const scheduledFor =
      status === 'SCHEDULED' && scheduledAt
        ? new Date(scheduledAt).toISOString()
        : null;

    const payload = {
      titleFa,
      titleEn,
      excerptFa,
      excerptEn,
      summaryFa,
      summaryEn,
      contentFa: editorFa.getHTML(),
      contentEn: editorEn.getHTML(),
      status,
      categories: selectedCategories,
      tags: selectedTags,
      coverImageUrl: coverImageUrl ? coverImageUrl : null,
      scheduledFor
    };

    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('Failed to update article', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = (await response.json()) as { url: string };
      setCoverImageUrl(data.url);
    } catch (error) {
      console.error('Failed to upload media', error);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setActiveLocale('fa')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeLocale === 'fa' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-200'
          }`}
        >
          فارسی
        </button>
        <button
          type="button"
          onClick={() => setActiveLocale('en')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeLocale === 'en' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-200'
          }`}
        >
          English
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="space-y-2">
            <span className="block text-sm text-slate-300">تصویر کاور</span>
            <input
              type="url"
              placeholder="/media/..."
              value={coverImageUrl}
              onChange={(event) => setCoverImageUrl(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="flex w-full flex-col items-start gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/70 p-4 text-slate-200">
            <span className="text-sm">آپلود تصویر محلی (WebP خودکار)</span>
            <input type="file" accept="image/*" onChange={handleUpload} disabled={isUploading} />
            <span className="text-xs text-slate-500">حجم پیشنهادی &lt; 2MB</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCoverImageUrl('')}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-rose-400 hover:text-rose-300"
            >
              حذف تصویر
            </button>
            {isUploading ? <span className="text-xs text-emerald-400">در حال آپلود…</span> : null}
          </div>
          {coverImageUrl ? (
            <div className="relative h-40 w-full overflow-hidden rounded-lg">
              <Image
                src={coverImageUrl}
                alt="کاور مقاله"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ) : null}
        </div>
        <label className="space-y-2">
          <span className="block text-sm text-slate-300">عنوان فارسی</span>
          <input
            value={titleFa}
            onChange={(event) => setTitleFa(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="block text-sm text-slate-300">English Title</span>
          <input
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="block text-sm text-slate-300">چکیده فارسی</span>
          <textarea
            value={excerptFa}
            onChange={(event) => setExcerptFa(event.target.value)}
            className="h-32 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="block text-sm text-slate-300">English Excerpt</span>
          <textarea
            value={excerptEn}
            onChange={(event) => setExcerptEn(event.target.value)}
            className="h-32 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="block text-sm text-slate-300">خلاصه هوشمند فارسی</span>
          <textarea
            value={summaryFa}
            onChange={(event) => setSummaryFa(event.target.value)}
            className="h-28 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
            required
          />
          <span className="block text-xs text-slate-500">این خلاصه در کارت‌ها و JSON-LD استفاده می‌شود.</span>
        </label>
        <label className="space-y-2">
          <span className="block text-sm text-slate-300">AI Summary (English)</span>
          <textarea
            value={summaryEn}
            onChange={(event) => setSummaryEn(event.target.value)}
            className="h-28 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
            required
          />
          <span className="block text-xs text-slate-500">Used for English feeds and SEO snippet.</span>
        </label>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">محتوا</h2>
          <span className="text-xs text-slate-400">وارد کردن متن غنی با پشتیبانی از دو زبان</span>
        </div>
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          {activeLocale === 'fa' && editorFa ? (
            <EditorContent editor={editorFa} className="prose prose-invert max-w-none" />
          ) : null}
          {activeLocale === 'en' && editorEn ? (
            <EditorContent editor={editorEn} className="prose prose-invert max-w-none" />
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-300">دسته‌ها</legend>
          {categories.map((category) => {
            const checked = selectedCategories.includes(category.id);
            return (
              <label key={category.id} className="flex items-center gap-2 text-slate-200">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setSelectedCategories((current) =>
                      event.target.checked
                        ? [...current, category.id]
                        : current.filter((id) => id !== category.id)
                    );
                  }}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                />
                <span>
                  {category.nameFa ?? category.nameEn}
                  {category.nameEn ? <span className="text-xs text-slate-500"> · {category.nameEn}</span> : null}
                </span>
              </label>
            );
          })}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-300">برچسب‌ها</legend>
          {tags.map((tag) => {
            const checked = selectedTags.includes(tag.id);
            return (
              <label key={tag.id} className="flex items-center gap-2 text-slate-200">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setSelectedTags((current) =>
                      event.target.checked
                        ? [...current, tag.id]
                        : current.filter((id) => id !== tag.id)
                    );
                  }}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                />
                <span>
                  {tag.nameFa ?? tag.nameEn}
                  {tag.nameEn ? <span className="text-xs text-slate-500"> · {tag.nameEn}</span> : null}
                </span>
              </label>
            );
          })}
        </fieldset>
      </div>

      <div className="flex items-center justify-between">
        <label className="space-y-2">
          <span className="block text-sm text-slate-300">وضعیت انتشار</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ArticleStatus)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
          >
            {ARTICLE_STATUSES.map((value) => (
              <option key={value} value={value} className="bg-slate-900 text-slate-900">
                {value}
              </option>
            ))}
          </select>
        </label>
        {status === 'SCHEDULED' ? (
          <label className="space-y-2">
            <span className="block text-sm text-slate-300">زمان انتشار</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
              required
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
        >
          {isSubmitting ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
        </button>
      </div>
    </form>
  );
}
