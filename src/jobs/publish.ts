import { prisma } from '@/lib/db/client';
import { Status } from '@prisma/client';
import { enqueueJob, JOB_NAMES } from './queue';
import { sendArticlePublishedNotification } from '@/lib/notifications/push';

export async function publishScheduledArticle(articleId: string) {
  try {
    const article = await prisma.article.update({
      where: { id: articleId, status: Status.SCHEDULED },
      data: {
        status: Status.PUBLISHED,
        scheduledFor: null,
        scheduleJobId: null,
        publishedAt: new Date()
      },
      select: {
        slug: true,
        titleFa: true,
        titleEn: true,
        excerptFa: true,
        excerptEn: true,
        language: true,
        coverImageUrl: true
      }
    });

    await enqueueJob(JOB_NAMES.REVALIDATE, { slug: article.slug });
    await enqueueJob(
      JOB_NAMES.TREND_REFRESH,
      {},
      { singletonKey: 'trend-refresh', singletonMinutes: 30 }
    );

    await sendArticlePublishedNotification({
      slug: article.slug,
      title: article.titleFa ?? article.titleEn ?? article.slug,
      excerpt: article.excerptFa ?? article.excerptEn,
      coverImageUrl: article.coverImageUrl,
      locale: article.language === 'EN' ? 'en' : 'fa'
    });
  } catch (error) {
    console.warn('Scheduled publish skipped', articleId, error);
  }
}

export async function releaseDueArticles() {
  const dueArticles = await prisma.article.findMany({
    where: {
      status: Status.SCHEDULED,
      scheduledFor: { lte: new Date() }
    },
    select: { id: true }
  });

  for (const article of dueArticles) {
    await publishScheduledArticle(article.id);
  }
}
