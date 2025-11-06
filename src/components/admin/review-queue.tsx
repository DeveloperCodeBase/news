'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ArticleStatus } from '@/lib/news/status';

type ReviewArticle = {
  id: string;
  slug: string;
  titleFa: string;
  titleEn: string | null;
  status: ArticleStatus;
  publishedAt: string | Date;
  scheduledFor?: string | Date | null;
  source: { name: string } | null;
};

type ReviewQueueProps = {
  articles: ReviewArticle[];
};

export default function ReviewQueue({ articles }: ReviewQueueProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewArticle[]>(articles);

  async function updateStatus(id: string, status: ArticleStatus) {
    setPending(id);
    try {
      const response = await fetch(`/api/admin/articles/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error('failed');
      }
      setItems((current) => current.filter((article) => article.id !== id));
    } catch (error) {
      console.error('Failed to update status', error);
    } finally {
      setPending(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-slate-400">صف بازبینی خالی است.</p>;
  }

  return (
    <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
      {items.map((article) => (
        <article
          key={article.id}
          className="flex flex-col gap-4 bg-slate-900/60 p-6 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-lg font-semibold text-slate-100">
              {article.titleFa || article.titleEn || 'بدون عنوان'}
            </p>
            <p className="text-sm text-slate-400">
              منبع: {article.source?.name ?? 'نامشخص'} ·{' '}
              {article.status === 'SCHEDULED' && article.scheduledFor
                ? `برنامه‌ریزی شده برای ${new Date(article.scheduledFor).toLocaleString('fa-IR')}`
                : `زمان انتشار: ${new Date(article.publishedAt).toLocaleString('fa-IR')}`}
            </p>
            <Link href={`/admin/articles/${article.id}`} className="mt-1 inline-block text-sm text-emerald-400 hover:text-emerald-300">
              ویرایش و بررسی کامل
            </Link>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => updateStatus(article.id, 'PUBLISHED')}
              disabled={pending === article.id}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-60"
            >
              تأیید و انتشار
            </button>
            <button
              type="button"
              onClick={() => updateStatus(article.id, 'REJECTED')}
              disabled={pending === article.id}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-60"
            >
              رد خبر
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
