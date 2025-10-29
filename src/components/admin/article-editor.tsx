'use client';

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
    titleEn: string;
    excerptFa: string;
    excerptEn: string;
    contentFa: string;
    contentEn: string;
    status: ArticleStatus;
    categories: { category: Taxonomy }[];
    tags: { tag: Taxonomy }[];
  };
  taxonomies: {
    categories: Taxonomy[];
    tags: Taxonomy[];
  };
};

export default function ArticleEditor({ article, taxonomies }: ArticleEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ArticleStatus>(article.status);
  const [titleFa, setTitleFa] = useState(article.titleFa);
  const [titleEn, setTitleEn] = useState(article.titleEn);
  const [excerptFa, setExcerptFa] = useState(article.excerptFa);
  const [excerptEn, setExcerptEn] = useState(article.excerptEn);
  const [selectedCategories, setSelectedCategories] = useState(() =>
    article.categories.map(({ category }) => category.id)
  );
  const [selectedTags, setSelectedTags] = useState(() => article.tags.map(({ tag }) => tag.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeLocale, setActiveLocale] = useState<'fa' | 'en'>('fa');

  const editorFa = useEditor({
    extensions: [StarterKit],
    content: article.contentFa
  });

  const editorEn = useEditor({
    extensions: [StarterKit],
    content: article.contentEn
  });

  const categories = useMemo(() => taxonomies.categories, [taxonomies.categories]);
  const tags = useMemo(() => taxonomies.tags, [taxonomies.tags]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editorFa || !editorEn) return;
    setIsSubmitting(true);

    const payload = {
      titleFa,
      titleEn,
      excerptFa,
      excerptEn,
      contentFa: editorFa.getHTML(),
      contentEn: editorEn.getHTML(),
      status,
      categories: selectedCategories,
      tags: selectedTags
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
