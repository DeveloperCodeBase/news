import NewsletterComposer from '@/components/admin/newsletter-composer';
import { prisma } from '@/lib/db/client';
import { Status } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function NewsletterPage() {
  const articles = await prisma.article.findMany({
    where: { status: Status.PUBLISHED },
    orderBy: { publishedAt: 'desc' },
    take: 8,
    select: { id: true, titleFa: true, titleEn: true, excerptFa: true, excerptEn: true }
  });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">ارسال خبرنامه</h1>
        <p className="text-slate-400">ساخت ایمیل خبری حرفه‌ای برای اطلاع‌رسانی سریع به مدیران و مشترکان.</p>
      </header>
      <NewsletterComposer
        articles={articles.map((article) => ({
          id: article.id,
          title: article.titleFa ?? article.titleEn,
          excerpt: article.excerptFa ?? article.excerptEn
        }))}
      />
    </section>
  );
}
