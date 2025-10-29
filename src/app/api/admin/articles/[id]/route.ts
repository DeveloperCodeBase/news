import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { JOB_NAMES, enqueueJob } from '@/jobs/queue';
import { isEditorialRole } from '@/lib/auth/permissions';
import { Status } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/options';

const coverImageSchema = z
  .string()
  .refine((value) => {
    if (!value) return false;
    if (value.startsWith('/')) return true;
    try {
      new URL(value);
      return true;
    } catch (error) {
      return false;
    }
  }, 'Invalid cover image URL')
  .optional()
  .nullable();

const updateArticleSchema = z.object({
  titleFa: z.string().min(3),
  titleEn: z.string().min(3),
  excerptFa: z.string().min(3),
  excerptEn: z.string().min(3),
  contentFa: z.string().min(3),
  contentEn: z.string().min(3),
  status: z.nativeEnum(Status),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  coverImageUrl: coverImageSchema
});

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

  const { titleFa, titleEn, excerptFa, excerptEn, contentFa, contentEn, status, categories, tags, coverImageUrl } = payload.data;

  const article = await prisma.article.update({
    where: { id: params.id },
    data: {
      titleFa,
      titleEn,
      excerptFa,
      excerptEn,
      contentFa,
      contentEn,
      status,
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
      status: true
    }
  });

  if (article.status === Status.PUBLISHED) {
    await enqueueJob(JOB_NAMES.REVALIDATE, { slug: article.slug });
  }

  return NextResponse.json({ updated: true, article });
}
