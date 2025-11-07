import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { disableArticlesFromSource } from '@/lib/db/sources';
import { normalizeRole } from '@/lib/auth/permissions';

const urlSchema = z
  .string()
  .url()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const patchSchema = z.object({
  name: z.string().min(3).optional(),
  homepageUrl: z.string().url().optional(),
  rssUrl: urlSchema,
  scrapeUrl: urlSchema,
  language: z.string().min(2).max(10).optional(),
  region: z.string().min(2).max(10).optional().nullable(),
  topicTags: z.array(z.string().min(1)).optional(),
  enabled: z.boolean().optional(),
  isTrusted: z.boolean().optional(),
  blacklisted: z.boolean().optional(),
  notes: z.string().max(400).optional().nullable(),
  priority: z.number().int().min(1).max(99).optional()
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = normalizeRole(session.user.role);
  if (role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const json = await request.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};

  if (data.name !== undefined) update.name = data.name.trim();
  if (data.homepageUrl !== undefined) update.homepageUrl = data.homepageUrl.trim();
  if (data.rssUrl !== undefined) update.rssUrl = data.rssUrl ?? null;
  if (data.scrapeUrl !== undefined) update.scrapeUrl = data.scrapeUrl ?? null;
  if (data.language !== undefined) update.language = data.language.toLowerCase();
  if (data.region !== undefined) update.region = data.region ? data.region.toUpperCase() : null;
  if (data.topicTags !== undefined) update.topicTags = data.topicTags;
  if (data.enabled !== undefined) update.enabled = data.enabled;
  if (data.isTrusted !== undefined) update.isTrusted = data.isTrusted;
  if (data.blacklisted !== undefined) update.blacklisted = data.blacklisted;
  if (data.notes !== undefined) update.notes = data.notes ?? null;
  if (data.priority !== undefined) update.priority = data.priority;

  const source = await prisma.newsSource.update({
    where: { id: params.id },
    data: update
  });

  if (data.blacklisted === true || data.enabled === false) {
    await disableArticlesFromSource(params.id);
  }

  return NextResponse.json({ updated: true, source });
}
