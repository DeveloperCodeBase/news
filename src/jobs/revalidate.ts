import { prisma } from '@/lib/db/client';

export async function runRevalidate(slug: string) {
  await prisma.article.updateMany({
    where: { slug },
    data: { updatedAt: new Date() }
  });
}
