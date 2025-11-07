import { IngestionStatus, Status } from '@prisma/client';
import { prisma } from './client';

export async function getActiveNewsSources() {
  return prisma.newsSource.findMany({
    where: { enabled: true, blacklisted: false },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
  });
}

export async function getAdminNewsSources() {
  return prisma.newsSource.findMany({
    orderBy: [
      { enabled: 'desc' },
      { lastStatus: 'asc' },
      { priority: 'asc' },
      { createdAt: 'desc' }
    ]
  });
}

export async function disableArticlesFromSource(newsSourceId: string) {
  await prisma.article.updateMany({
    where: { newsSourceId, status: { in: [Status.REVIEWED, Status.SCHEDULED] } },
    data: { status: Status.REVIEWED, scheduledFor: null, scheduleJobId: null }
  });
}

export async function updateNewsSourceIngestionStatus(
  id: string,
  data: {
    status: IngestionStatus;
    statusCode?: number | null;
    errorMessage?: string | null;
    fetchedAt: Date;
  }
) {
  await prisma.newsSource.update({
    where: { id },
    data: {
      lastStatus: data.status,
      lastStatusCode: data.statusCode ?? null,
      lastErrorMessage: data.errorMessage ?? null,
      lastFetchAt: data.fetchedAt
    }
  });
}

export async function getNewsSourceHealthSummary() {
  const [total, enabled, okCount, errorCount, unknownCount, recentFailures] = await Promise.all([
    prisma.newsSource.count(),
    prisma.newsSource.count({ where: { enabled: true } }),
    prisma.newsSource.count({ where: { lastStatus: IngestionStatus.OK } }),
    prisma.newsSource.count({ where: { lastStatus: IngestionStatus.ERROR } }),
    prisma.newsSource.count({ where: { lastStatus: IngestionStatus.UNKNOWN } }),
    prisma.newsSource.findMany({
      where: { lastStatus: IngestionStatus.ERROR },
      orderBy: [{ lastFetchAt: 'desc' }, { updatedAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        name: true,
        homepageUrl: true,
        lastStatusCode: true,
        lastErrorMessage: true,
        lastFetchAt: true
      }
    })
  ]);

  return {
    totals: {
      total,
      enabled,
      ok: okCount,
      error: errorCount,
      unknown: unknownCount
    },
    recentFailures
  };
}
