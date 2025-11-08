import slugify from '@sindresorhus/slugify';
import { prisma } from '../db/client';

export async function generateUniqueArticleSlug(title: string, publishedAt?: Date | null): Promise<string> {
  const referenceDate = publishedAt ?? new Date();
  const base = slugify(title, { decamelize: false, separator: '-' }).slice(0, 80);
  const stamp = referenceDate.toISOString().slice(0, 10).replace(/-/g, '');
  let slug = `${stamp}-${base}`.replace(/-+/g, '-');
  let attempts = 0;

  while (attempts < 5) {
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing) return slug;
    attempts += 1;
    slug = `${slug}-${attempts}`;
  }

  return `${slug}-${Date.now()}`;
}
