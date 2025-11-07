import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { normalizeRole } from '@/lib/auth/permissions';
import { Role } from '@prisma/client';

const urlSchema = z
  .string()
  .url()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const createSourceSchema = z.object({
  name: z.string().min(3),
  homepageUrl: z.string().url(),
  rssUrl: urlSchema,
  scrapeUrl: urlSchema,
  language: z.string().min(2).max(10).optional().default('en'),
  region: z.string().min(2).max(10).optional().nullable(),
  topicTags: z.array(z.string().min(1)).optional().default([]),
  enabled: z.boolean().optional().default(true),
  isTrusted: z.boolean().optional().default(true),
  notes: z.string().max(400).optional().nullable(),
  priority: z.number().int().min(1).max(99).optional().default(10)
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = normalizeRole(session.user.role);
  if (role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const json = await request.json();
  const parsed = createSourceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const source = await prisma.newsSource.create({
    data: {
      name: data.name.trim(),
      homepageUrl: data.homepageUrl.trim(),
      rssUrl: data.rssUrl ?? null,
      scrapeUrl: data.scrapeUrl ?? null,
      language: data.language.toLowerCase(),
      region: data.region ? data.region.toUpperCase() : null,
      topicTags: data.topicTags,
      enabled: data.enabled,
      isTrusted: data.isTrusted,
      notes: data.notes ?? null,
      priority: data.priority
    }
  });

  return NextResponse.json({ created: true, source }, { status: 201 });
}
