import { prisma } from './client';
import { Prisma, Status, ExperimentStatus, Lang } from '@prisma/client';
import type { AppLocale } from '../i18n/config';
import { withPrismaConnectionFallback } from './errors';

const ARTICLE_SELECT = {
  id: true,
  slug: true,
  titleFa: true,
  titleEn: true,
  excerptFa: true,
  excerptEn: true,
  summaryFa: true,
  summaryEn: true,
  contentFa: true,
  contentEn: true,
  coverImageUrl: true,
  publishedAt: true,
  scheduledFor: true,
  status: true,
  urlCanonical: true,
  newsSource: {
    select: {
      id: true,
      name: true,
      url: true,
      isTrusted: true
    }
  },
  categories: {
    select: {
      categoryId: true,
      category: {
        select: {
          id: true,
          slug: true,
          nameFa: true,
          nameEn: true
        }
      }
    }
  },
  tags: {
    select: {
      tagId: true,
      tag: {
        select: {
          id: true,
          slug: true,
          nameFa: true,
          nameEn: true
        }
      }
    }
  },
  topics: {
    select: {
      label: true,
      score: true
    }
  }
} as const;

type HomepageArticle = Prisma.ArticleGetPayload<{ select: typeof ARTICLE_SELECT }>;
type HomepageArticles = HomepageArticle[];

export async function getHomepageArticles(limit = 12): Promise<HomepageArticles> {
  return withPrismaConnectionFallback(
    () =>
      prisma.article.findMany({
        where: { status: Status.PUBLISHED },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        select: ARTICLE_SELECT
      }),
    [] as HomepageArticles
  );
}

export type ReviewQueueArticle = {
  id: string;
  slug: string;
  titleFa: string;
  titleEn: string | null;
  summaryFa: string | null;
  summaryEn: string | null;
  status: Status;
  language: Lang;
  publishedAt: Date;
  updatedAt: Date;
  scheduledFor: Date | null;
  newsSource: { name: string } | null;
};

export type ReviewQueueStats = {
  reviewed: number;
  draft: number;
  scheduled: number;
  pendingReview: number;
};

export type ReviewQueueSnapshot = {
  articles: ReviewQueueArticle[];
  stats: ReviewQueueStats;
};

export type ReviewQueueFilters = {
  statuses?: Status[];
  language?: Lang;
  search?: string;
  limit?: number;
};

export async function getReviewQueueSnapshot(filters: ReviewQueueFilters = {}): Promise<ReviewQueueSnapshot> {
  const statuses = (filters.statuses?.length ? filters.statuses : [Status.REVIEWED, Status.DRAFT]).map((status) =>
    status
  );

  const where: Prisma.ArticleWhereInput = {
    status: { in: statuses }
  };

  if (filters.language) {
    where.language = filters.language;
  }

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { titleFa: { contains: search, mode: 'insensitive' } },
      { titleEn: { contains: search, mode: 'insensitive' } },
      { newsSource: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const take = filters.limit ?? 25;

  const [articles, reviewedCount, draftCount, scheduledCount] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take,
      select: {
        id: true,
        slug: true,
        titleFa: true,
        titleEn: true,
        summaryFa: true,
        summaryEn: true,
        status: true,
        language: true,
        publishedAt: true,
        updatedAt: true,
        scheduledFor: true,
        newsSource: { select: { name: true } }
      }
    }),
    prisma.article.count({ where: { status: Status.REVIEWED } }),
    prisma.article.count({ where: { status: Status.DRAFT } }),
    prisma.article.count({ where: { status: Status.SCHEDULED } })
  ]);

  return {
    articles,
    stats: {
      reviewed: reviewedCount,
      draft: draftCount,
      scheduled: scheduledCount,
      pendingReview: reviewedCount + draftCount
    }
  };
}

export async function getReviewQueueArticles(limit = 25) {
  const snapshot = await getReviewQueueSnapshot({ limit });
  return snapshot.articles;
}

export async function getArticleBySlug(slug: string) {
  return prisma.article.findUnique({
    where: { slug },
    select: ARTICLE_SELECT
  });
}

export async function getArticleForAdmin(id: string) {
  return prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      titleFa: true,
      titleEn: true,
      excerptFa: true,
      excerptEn: true,
      summaryFa: true,
      summaryEn: true,
      contentFa: true,
      contentEn: true,
      status: true,
      scheduledFor: true,
      coverImageUrl: true,
      categories: { select: { category: { select: { id: true, nameFa: true, nameEn: true } } } },
      tags: { select: { tag: { select: { id: true, nameFa: true, nameEn: true } } } }
    }
  });
}

export async function getScheduledArticles(limit = 25) {
  return prisma.article.findMany({
    where: { status: Status.SCHEDULED },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
    select: {
      id: true,
      slug: true,
      titleFa: true,
      titleEn: true,
      scheduledFor: true,
      newsSource: { select: { name: true } }
    }
  });
}

export async function getArticleAnalyticsSummary() {
  const [totals, topArticles] = await Promise.all([
    prisma.articleAnalytics.aggregate({
      _sum: { totalViews: true, uniqueVisitors: true, totalReadTimeMs: true, totalCompletion: true },
      _count: true
    }),
    prisma.article.findMany({
      where: { analytics: { isNot: null } },
      select: {
        id: true,
        slug: true,
        titleFa: true,
        titleEn: true,
        analytics: {
          select: {
            totalViews: true,
            uniqueVisitors: true,
            totalReadTimeMs: true,
            totalCompletion: true,
            avgReadTimeMs: true,
            avgCompletion: true,
            updatedAt: true,
            lastViewedAt: true
          }
        }
      },
      orderBy: {
        analytics: {
          totalViews: 'desc'
        }
      },
      take: 10
    })
  ]);

  const totalViews = totals._sum.totalViews ?? 0;
  const totalVisitors = totals._sum.uniqueVisitors ?? 0;
  const totalReadTime = totals._sum.totalReadTimeMs ?? 0;
  const totalCompletion = totals._sum.totalCompletion ?? 0;
  const avgReadTimeMs = totalViews > 0 ? Math.round(totalReadTime / totalViews) : 0;
  const avgCompletion = totalViews > 0 ? totalCompletion / totalViews : 0;

  return {
    totals: {
      views: totalViews,
      visitors: totalVisitors,
      avgReadTimeMs,
      avgCompletion
    },
    topArticles: topArticles.map((article) => ({
      id: article.id,
      slug: article.slug,
      titleFa: article.titleFa,
      titleEn: article.titleEn,
      analytics: article.analytics && {
        ...article.analytics,
        avgReadTimeMs:
          article.analytics.totalViews > 0
            ? Math.round(article.analytics.totalReadTimeMs / article.analytics.totalViews)
            : 0,
        avgCompletion:
          article.analytics.totalViews > 0
            ? article.analytics.totalCompletion / article.analytics.totalViews
            : 0
      }
    }))
  };
}

export async function getAdminTaxonomies() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ select: { id: true, nameFa: true, nameEn: true } }),
    prisma.tag.findMany({ select: { id: true, nameFa: true, nameEn: true } })
  ]);

  return { categories, tags };
}

export async function getRelatedArticles(articleId: string, categoryIds: string[], take = 4) {
  if (categoryIds.length === 0) {
    return [];
  }

  return prisma.article.findMany({
    where: {
      status: Status.PUBLISHED,
      id: { not: articleId },
      categories: {
        some: {
          categoryId: {
            in: categoryIds
          }
        }
      }
    },
    orderBy: { publishedAt: 'desc' },
    take,
    select: ARTICLE_SELECT
  });
}

export async function searchArticles(query: string, locale: AppLocale, limit = 10) {
  const text = query.trim();
  if (!text) return [];

  const orderBy =
    locale === 'fa'
      ? [{ publishedAt: 'desc' as const }, { titleFa: 'asc' as const }]
      : [{ publishedAt: 'desc' as const }, { titleEn: 'asc' as const }];

  return prisma.article.findMany({
    where: {
      status: Status.PUBLISHED,
      OR: [
        { titleFa: { contains: text, mode: 'insensitive' } },
        { titleEn: { contains: text, mode: 'insensitive' } },
        { excerptFa: { contains: text, mode: 'insensitive' } },
        { excerptEn: { contains: text, mode: 'insensitive' } },
        { summaryFa: { contains: text, mode: 'insensitive' } },
        { summaryEn: { contains: text, mode: 'insensitive' } }
      ]
    },
    select: ARTICLE_SELECT,
    orderBy,
    take: limit
  });
}

type CategorySummaryRecord = {
  slug: string;
  nameFa: string;
  nameEn: string | null;
  articles: { articleId: string }[];
};

export async function getCategorySummaries(locale: AppLocale, limit = 6) {
  const categories = await withPrismaConnectionFallback(
    () =>
      prisma.category.findMany({
        select: {
          slug: true,
          nameFa: true,
          nameEn: true,
          articles: {
            where: { article: { status: Status.PUBLISHED } },
            select: { articleId: true }
          }
        },
        orderBy: { articles: { _count: 'desc' } },
        take: limit
      }),
    [] as CategorySummaryRecord[]
  );

  return categories.map((category) => ({
    slug: category.slug,
    nameFa: category.nameFa,
    nameEn: category.nameEn,
    count: category.articles.length
  }));
}

export async function getCoreWebVitalSummary(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const grouped = await prisma.coreWebVital.groupBy({
    by: ['metric', 'rating'],
    _avg: { value: true },
    _count: { _all: true },
    where: { createdAt: { gte: since } }
  });

  const latest = await prisma.coreWebVital.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return { grouped, latest };
}

export async function getTrendHighlights(limit = 8) {
  const snapshot = await prisma.trendSnapshot.findFirst({
    orderBy: { generatedAt: 'desc' },
    include: {
      topics: {
        orderBy: { score: 'desc' },
        take: limit
      }
    }
  });

  return snapshot;
}

export async function getExperimentSummaries(days = 14) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const experiments = await prisma.experiment.findMany({
    where: { status: { in: [ExperimentStatus.RUNNING, ExperimentStatus.PAUSED] } },
    include: {
      variants: {
        include: {
          _count: { select: { assignments: true } }
        }
      }
    }
  });

  const metrics = await prisma.experimentMetric.groupBy({
    by: ['experimentId', 'variantId', 'metric'],
    _sum: { value: true },
    where: { recordedAt: { gte: since } }
  });

  return experiments.map((experiment) => {
    const variantSummaries = experiment.variants.map((variant) => {
      const variantMetrics = metrics.filter(
        (metric) => metric.variantId === variant.id && metric.experimentId === experiment.id
      );
      const mapped = Object.fromEntries(
        variantMetrics.map((metric) => [metric.metric, Number((metric._sum.value ?? 0).toFixed(2))])
      );
      return {
        key: variant.key,
        label: variant.label,
        templateType: variant.templateType,
        templatePath: variant.templatePath,
        assignments: variant._count.assignments,
        metrics: mapped
      };
    });

    return {
      key: experiment.key,
      name: experiment.name,
      status: experiment.status,
      variants: variantSummaries
    };
  });
}
