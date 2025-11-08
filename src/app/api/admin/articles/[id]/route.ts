import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Status } from '@prisma/client';
import { authOptions } from '@/lib/auth/options';
import { isEditorialRole } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { JOB_NAMES, enqueueJob, getBoss } from '@/jobs/queue';
import { publishScheduledArticle } from '@/jobs/publish';

const coverImageSchema = z
  .string()
  .refine((value) => {
    if (!value) return false;
    if (value.startsWith('/')) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid cover image URL')
  .optional()
  .nullable();

const updateArticleSchema = z
  .object({
    titleFa: z.string().min(3),
    titleEn: z.string().min(3),
    excerptFa: z.string().min(3),
    excerptEn: z.string().min(3),
    summaryFa: z.string().min(3),
    summaryEn: z.string().min(3),
    contentFa: z.string().min(3),
    contentEn: z.string().min(3),
    status: z.nativeEnum(Status),
    categories: z.array(z.string()),
    tags: z.array(z.string()),
    coverImageUrl: coverImageSchema,
    scheduledFor: z.string().datetime().optional().nullable()
  })
  .refine(
    (data) => {
      if (data.status === Status.SCHEDULED) {
        return Boolean(data.scheduledFor);
      }
      return true;
    },
    { message: 'Scheduled articles require a publish time.', path: ['scheduledFor'] }
  );

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.role || !isEditorialRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const payload = updateArticleSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json({ error: 'Invalid payload', details: payload.error.flatten() }, { status: 400 });
  }

  const {
    titleFa,
    titleEn,
    excerptFa,
    excerptEn,
    summaryFa,
    summaryEn,
    contentFa,
    contentEn,
    status,
    categories,
    tags,
    coverImageUrl,
    scheduledFor
  } = payload.data;

  const scheduledForDate = scheduledFor ? new Date(scheduledFor) : null;
  if (scheduledForDate && Number.isNaN(scheduledForDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduled date' }, { status: 400 });
  }

  const existing = await prisma.article.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true, scheduleJobId: true }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const article = await prisma.article.update({
    where: { id: params.id },
    data: {
      titleFa,
      titleEn,
      excerptFa,
      excerptEn,
      summaryFa,
      summaryEn,
      contentFa,
      contentEn,
      status,
      scheduledFor: status === Status.SCHEDULED ? scheduledForDate : null,
      scheduleJobId: status === Status.SCHEDULED ? existing.scheduleJobId : null,
      publishedAt: status === Status.PUBLISHED ? new Date() : null,
      categories: {
        deleteMany: {},
        ...(categories.length
          ? {
              create: categories.map((categoryId) => ({ category: { connect: { id: categoryId } } }))
            }
          : {})
      },
      tags: {
        deleteMany: {},
        ...(tags.length
          ? {
              create: tags.map((tagId) => ({ tag: { connect: { id: tagId } } }))
            }
          : {})
      },
      coverImageUrl: coverImageUrl ?? null
    },
    select: {
      id: true,
      slug: true,
      status: true,
      scheduleJobId: true,
      scheduledFor: true
    }
  });

  const boss = await getBoss();

  if (existing.scheduleJobId && article.status !== Status.SCHEDULED) {
    await boss.cancel(existing.scheduleJobId).catch(() => undefined);
    await prisma.article.update({ where: { id: article.id }, data: { scheduleJobId: null, scheduledFor: null } });
  }

  if (article.status === Status.PUBLISHED) {
    await enqueueJob(JOB_NAMES.REVALIDATE, { slug: article.slug });
  }

  if (article.status === Status.SCHEDULED && scheduledForDate && scheduledForDate <= new Date()) {
    await publishScheduledArticle(article.id);
    const refreshed = await prisma.article.findUnique({
      where: { id: article.id },
      select: { id: true, slug: true, status: true, scheduleJobId: true, scheduledFor: true }
    });
    return NextResponse.json({ updated: true, article: refreshed });
  }

  if (article.status === Status.SCHEDULED && scheduledForDate) {
    if (existing.scheduleJobId) {
      await boss.cancel(existing.scheduleJobId).catch(() => undefined);
    }
    const jobId = await enqueueJob(JOB_NAMES.PUBLISH_SCHEDULED, { articleId: article.id }, { startAfter: scheduledForDate });
    if (jobId) {
      await prisma.article.update({ where: { id: article.id }, data: { scheduleJobId: jobId } });
    }
  }

  return NextResponse.json({ updated: true, article });
}
