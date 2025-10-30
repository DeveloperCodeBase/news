import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';
import { disableArticlesFromSource } from '@/lib/db/sources';

const patchSchema = z.object({
  name: z.string().min(3).optional(),
  url: z.string().url().optional(),
  feedUrl: z.string().url().optional(),
  isTrusted: z.boolean().optional(),
  active: z.boolean().optional(),
  blacklisted: z.boolean().optional(),
  notes: z.string().max(400).optional().nullable(),
  priority: z.number().int().min(1).max(99).optional()
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const json = await request.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if ('notes' in parsed.data) {
    updateData.notes = parsed.data.notes ?? null;
  }

  const source = await prisma.source.update({
    where: { id: params.id },
    data: updateData
  });

  if (parsed.data.blacklisted === true || parsed.data.active === false) {
    await disableArticlesFromSource(params.id);
  }

  return NextResponse.json({ updated: true, source });
}
