export const ARTICLE_STATUSES = ['DRAFT', 'REVIEWED', 'PUBLISHED', 'REJECTED'] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];
