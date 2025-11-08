import type { ComponentProps } from 'react';
import ArticleEditor from '@/components/admin/article-editor';
import { getAdminTaxonomies, getArticleForAdmin } from '@/lib/db/articles';
import type { ArticleStatus } from '@/lib/news/status';
import { notFound } from 'next/navigation';

type PageProps = {
  params: { id: string };
  searchParams?: { returnTo?: string; source?: string };
};

export default async function AdminArticlePage({ params, searchParams }: PageProps) {
  const article = await getArticleForAdmin(params.id);
  if (!article) {
    notFound();
  }

  const taxonomies = await getAdminTaxonomies();

  const normalizedArticle: ComponentProps<typeof ArticleEditor>['article'] = {
    ...article,
    status: article.status as ArticleStatus,
    scheduledFor: article.scheduledFor ? article.scheduledFor.toISOString() : null
  };

  const encodedReturn = searchParams?.returnTo ?? '/admin';
  const returnPath = decodeURIComponent(encodedReturn);
  const sourceKey = searchParams?.source;
  const originLabel =
    sourceKey === 'schedule'
      ? 'بازگشت به زمان‌بندی'
      : sourceKey === 'review'
      ? 'بازگشت به صف بازبینی'
      : 'بازگشت به مدیریت';

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-100">ویرایش خبر</h1>
        <p className="text-slate-400">ویرایش محتوای فارسی و انگلیسی، دسته‌بندی و وضعیت انتشار.</p>
      </header>
      <ArticleEditor
        article={normalizedArticle}
        taxonomies={taxonomies}
        returnPath={returnPath}
        originLabel={originLabel}
      />
    </section>
  );
}
