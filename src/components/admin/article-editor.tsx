'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ARTICLE_STATUSES, type ArticleStatus } from '@/lib/news/status';
import { parseFaTranslationMeta } from '@/lib/translation/meta';
import type { TranslationFieldState } from '@/lib/translation/meta';

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
    sourceImageUrl?: string | null;
    videoUrl?: string | null;
    newsSource?: { id: string; name: string | null; homepageUrl: string | null } | null;
    faTranslationMeta?: unknown;
  };
  taxonomies: {
    categories: Taxonomy[];
    tags: Taxonomy[];
  };
  returnPath?: string;
  originLabel?: string;
};

export default function ArticleEditor({ article, taxonomies, returnPath, originLabel }: ArticleEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ArticleStatus>(article.status);
  const [titleFa, setTitleFa] = useState<string>(article.titleFa);
  const [titleEn] = useState<string>(article.titleEn ?? '');
  const [excerptFa, setExcerptFa] = useState<string>(article.excerptFa ?? '');
  const [excerptEn] = useState<string>(article.excerptEn ?? '');
  const [summaryFa, setSummaryFa] = useState<string>(
    article.summaryFa ?? article.excerptFa ?? ''
  );
  const [summaryEn] = useState<string>(
    article.summaryEn ?? article.excerptEn ?? ''
  );
  const [selectedCategories, setSelectedCategories] = useState(() =>
    article.categories.map(({ category }) => category.id)
  );
  const [selectedTags, setSelectedTags] = useState(() => article.tags.map(({ tag }) => tag.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState(article.coverImageUrl ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(article.videoUrl ?? '');
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
    content: article.contentEn ?? '',
    editable: false
  });

  const categories = useMemo(() => taxonomies.categories, [taxonomies.categories]);
  const tags = useMemo(() => taxonomies.tags, [taxonomies.tags]);
  const translationMeta = useMemo(() => parseFaTranslationMeta(article.faTranslationMeta ?? null), [article.faTranslationMeta]);

  const renderTranslationBadge = (state: TranslationFieldState | undefined) => {
    if (!state) return null;
    let label = '';
    let className = '';
    switch (state.status) {
      case 'translated':
        label = 'ترجمه خودکار';
        className = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
        break;
      case 'fallback':
        label = 'نیاز به ترجمه';
        className = 'border-amber-500/40 bg-amber-500/10 text-amber-200';
        break;
      case 'manual':
        label = 'ویرایش دستی';
        className = 'border-sky-500/40 bg-sky-500/10 text-sky-200';
        break;
      case 'source':
      default:
        label = 'متن اصلی';
        className = 'border-slate-700/60 bg-slate-800/60 text-slate-200';
        break;
    }
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>
    );
  };

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
      scheduledFor,
      videoUrl: videoUrl.trim() ? videoUrl.trim() : null
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

      const destination = returnPath ?? '/admin';
      router.push(destination);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            const destination = returnPath ?? '/admin';
            router.push(destination);
          }}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-500 hover:text-sky-200"
        >
          {originLabel ?? 'بازگشت'}
        </button>
        {article.newsSource ? (
          <div className="text-xs text-slate-400">
            منبع: {article.newsSource.name ?? '—'}
            {article.newsSource.homepageUrl ? (
              <>
                {' '}
                ·{' '}
                <a
                  href={article.newsSource.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-300 hover:text-sky-200"
                >
                  {article.newsSource.homepageUrl.replace(/^https?:\/\//, '')}
                </a>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold text-slate-200">تصویر کاور</h2>
            <label className="space-y-2">
              <span className="block text-xs text-slate-400">آدرس تصویر</span>
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
            {article.sourceImageUrl ? (
              <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-950/70 p-3 text-xs text-slate-300">
                <p className="font-medium text-slate-200">تصویر اصلی منبع</p>
                <div className="relative h-32 w-full overflow-hidden rounded">
                  <Image
                    src={article.sourceImageUrl}
                    alt="تصویر منبع"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <code className="block truncate rounded bg-slate-900/80 px-2 py-1 text-[11px]">{article.sourceImageUrl}</code>
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">متن فارسی</h2>
                {renderTranslationBadge(translationMeta.title)}
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
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>چکیده فارسی</span>
                  {renderTranslationBadge(translationMeta.excerpt)}
                </div>
                <textarea
                  value={excerptFa}
                  onChange={(event) => setExcerptFa(event.target.value)}
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
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 className="text-lg font-semibold text-slate-200">English reference</h2>
              <label className="space-y-2">
                <span className="block text-xs text-slate-400">Original title</span>
                <input
                  value={titleEn}
                  readOnly
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-xs text-slate-400">Excerpt</span>
                <textarea
                  value={excerptEn}
                  readOnly
                  className="h-32 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-xs text-slate-400">AI Summary</span>
                <textarea
                  value={summaryEn}
                  readOnly
                  className="h-28 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">محتوای فارسی</span>
                {renderTranslationBadge(translationMeta.content)}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                {editorFa ? <EditorContent editor={editorFa} className="prose prose-invert max-w-none" /> : null}
              </div>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <span className="text-sm text-slate-300">English content</span>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                {editorEn ? <EditorContent editor={editorEn} className="prose prose-invert max-w-none" /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <label className="space-y-2">
        <span className="block text-sm text-slate-300">ویدیو (اختیاری)</span>
        <input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
        />
        <span className="block text-xs text-slate-500">
          لینک مستقیم یا YouTube/Vimeo. اگر خالی باشد، ویدیویی نمایش داده نمی‌شود.
        </span>
      </label>

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
