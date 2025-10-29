import { prisma } from './client';
import { Status } from '@prisma/client';
import type { AppLocale } from '@/lib/i18n/config';

const ARTICLE_SELECT = {
  id: true,
  slug: true,
  titleFa: true,
  titleEn: true,
  excerptFa: true,
  excerptEn: true,
  contentFa: true,
  contentEn: true,
  coverImageUrl: true,
  publishedAt: true,
  status: true,
  urlCanonical: true,
  source: {
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
  }
} as const;

export async function getHomepageArticles(limit = 12) {
  return prisma.article.findMany({
    where: { status: Status.PUBLISHED },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: ARTICLE_SELECT
  });
}

export async function getReviewQueueArticles(limit = 25) {
  return prisma.article.findMany({
    where: { status: { in: [Status.REVIEWED, Status.DRAFT] } },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      slug: true,
      titleFa: true,
      titleEn: true,
      status: true,
      publishedAt: true,
      source: { select: { name: true } }
    }
  });
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
      contentFa: true,
      contentEn: true,
      status: true,
      categories: { select: { category: { select: { id: true, nameFa: true, nameEn: true } } } },
      tags: { select: { tag: { select: { id: true, nameFa: true, nameEn: true } } } }
    }
  });
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
        { excerptEn: { contains: text, mode: 'insensitive' } }
      ]
    },
    select: ARTICLE_SELECT,
    orderBy,
    take: limit
  });
}

export async function getCategorySummaries(locale: AppLocale, limit = 6) {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      nameFa: true,
      nameEn: true,
      _count: {
        select: {
          CategoryOnArticle: {
            where: { article: { status: Status.PUBLISHED } }
          }
        }
      }
    },
    orderBy: { CategoryOnArticle: { _count: 'desc' } },
    take: limit
  });

  return categories.map((category) => ({
    slug: category.slug,
    nameFa: category.nameFa,
    nameEn: category.nameEn,
    count: category._count.CategoryOnArticle
  }));
}
