import ReviewQueue from '@/components/admin/review-queue';
import { getReviewQueueSnapshot } from '@/lib/db/articles';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const snapshot = await getReviewQueueSnapshot();

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">صف بازبینی</h1>
        <p className="text-slate-400">خبرهای جمع‌آوری شده که نیازمند تأیید انسانی هستند.</p>
      </header>
      <ReviewQueue initialSnapshot={snapshot} />
    </section>
  );
}
