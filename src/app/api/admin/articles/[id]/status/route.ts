import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { JOB_NAMES, enqueueJob } from '@/jobs/queue';
import { isEditorialRole } from '@/lib/auth/permissions';
import { Status } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/options';

const bodySchema = z.object({
  status: z.nativeEnum(Status)
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.role || !isEditorialRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = bodySchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const article = await prisma.article.update({
    where: { id: params.id },
    data: { status: payload.data.status },
    select: { slug: true, status: true }
  });

  if (article.status === Status.PUBLISHED) {
    await enqueueJob(JOB_NAMES.REVALIDATE, { slug: article.slug });
  }

  return NextResponse.json({ updated: true, status: article.status });
}
