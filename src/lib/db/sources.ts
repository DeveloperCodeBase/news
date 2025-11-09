import { IngestionStatus, Status, Prisma } from '@prisma/client';
import { prisma } from './client';

export type SourceListFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: IngestionStatus | 'all';
  enabled?: 'all' | 'enabled' | 'disabled';
};

export type SourceListResult = {
  sources: Awaited<ReturnType<typeof prisma.newsSource.findMany>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function getActiveNewsSources() {
  return prisma.newsSource.findMany({
    where: { enabled: true, blacklisted: false },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
  });
}

export async function listAdminNewsSources(filters: SourceListFilters = {}): Promise<SourceListResult> {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 10), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const skip = (page - 1) * pageSize;

  const where: Prisma.NewsSourceWhereInput = {};

  if (filters.status && filters.status !== 'all') {
    where.lastStatus = filters.status;
  }

  if (filters.enabled === 'enabled') {
    where.enabled = true;
  } else if (filters.enabled === 'disabled') {
    where.enabled = false;
  }

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { homepageUrl: { contains: search, mode: 'insensitive' } },
      { rssUrl: { contains: search, mode: 'insensitive' } },
      { scrapeUrl: { contains: search, mode: 'insensitive' } },
      {
        topicTags: {
          hasSome: search
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        }
      }
    ];
  }

  const orderBy: Prisma.NewsSourceOrderByWithRelationInput[] = [
    { enabled: 'desc' },
    { lastStatus: 'asc' },
    { priority: 'asc' },
    { createdAt: 'desc' }
  ];

  const total = await prisma.newsSource.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const adjustedPage = Math.min(page, totalPages);
  const adjustedSkip = (adjustedPage - 1) * pageSize;

  const sources = await prisma.newsSource.findMany({
    where,
    orderBy,
    skip: adjustedSkip,
    take: pageSize
  });

  return {
    sources,
    pagination: {
      page: adjustedPage,
      pageSize,
      total,
      totalPages
    }
  };
}

export async function getAdminNewsSources(filters: SourceListFilters = {}) {
  const { sources } = await listAdminNewsSources(filters);
  return sources;
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
