import ReviewQueue from '@/components/admin/review-queue';
import { getReviewQueueArticles } from '@/lib/db/articles';
import type { ArticleStatus } from '@/lib/news/status';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const articles = await getReviewQueueArticles();

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">صف بازبینی</h1>
        <p className="text-slate-400">خبرهای جمع‌آوری شده که نیازمند تأیید انسانی هستند.</p>
      </header>
      <ReviewQueue articles={articles.map((article) => ({ ...article, status: article.status as ArticleStatus }))} />
    </section>
  );
}
