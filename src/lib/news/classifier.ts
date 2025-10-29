import type { Category, Tag } from '@prisma/client';

const CATEGORY_RULES: Array<{ slug: Category['slug']; keywords: string[] }> = [
  { slug: 'news', keywords: ['announce', 'launch', 'update', 'خبر', 'معرفی'] },
  { slug: 'tools', keywords: ['tool', 'platform', 'library', 'ابزار'] },
  { slug: 'papers', keywords: ['research', 'paper', 'study', 'پژوهش', 'arxiv'] },
  { slug: 'industry', keywords: ['partnership', 'investment', 'market', 'صنعت'] },
  { slug: 'policy', keywords: ['policy', 'regulation', 'قانون', 'دولت'] },
  { slug: 'safety', keywords: ['safety', 'risk', 'ethical', 'امنیت'] },
  { slug: 'tutorials', keywords: ['how to', 'guide', 'راهنما', 'آموزش'] },
  { slug: 'events', keywords: ['conference', 'summit', 'event', 'رویداد'] }
];

const TAG_RULES: Array<{ slug: Tag['slug']; keywords: string[] }> = [
  { slug: 'llm', keywords: ['gpt', 'llm', 'large language model'] },
  { slug: 'vision', keywords: ['vision', 'image', 'cv', 'بینایی'] },
  { slug: 'nlp', keywords: ['nlp', 'language', 'متن'] },
  { slug: 'robot', keywords: ['robot', 'humanoid', 'روبات'] },
  { slug: 'compute', keywords: ['compute', 'chip', 'gpu', 'محاسبه'] },
  { slug: 'open-source', keywords: ['open source', 'github', 'کدباز'] }
];

export function classifyText(text: string) {
  const normalized = text.toLowerCase();
  const categories = CATEGORY_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
  ).map((rule) => rule.slug);

  const tags = TAG_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
  ).map((rule) => rule.slug);

  return {
    categories,
    tags
  };
}
