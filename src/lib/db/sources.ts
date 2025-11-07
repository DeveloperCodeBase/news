import { prisma } from './client';
import { Status } from '@prisma/client';

export async function getActiveSources() {
  return prisma.source.findMany({
    where: { active: true, blacklisted: false },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
  });
}

export async function getAdminSources() {
  return prisma.source.findMany({
    orderBy: [{ blacklisted: 'asc' }, { isTrusted: 'desc' }, { createdAt: 'desc' }]
  });
}

export async function disableArticlesFromSource(sourceId: string) {
  await prisma.article.updateMany({
    where: { sourceId, status: { in: [Status.REVIEWED, Status.SCHEDULED] } },
    data: { status: Status.REVIEWED, scheduledFor: null, scheduleJobId: null }
  });
}
