import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { normalizeRole } from '@/lib/auth/permissions';
import { getNewsSourceHealthSummary, listAdminNewsSources } from '@/lib/db/sources';
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

const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 1))
    .pipe(z.number().int().min(1).default(1)),
  pageSize: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 25))
    .pipe(z.number().int().min(10).max(100).default(25)),
  search: z.string().optional().transform((value) => value?.trim() ?? undefined),
  status: z
    .enum(['all', 'OK', 'ERROR', 'UNKNOWN'] as const)
    .optional()
    .default('all'),
  enabled: z
    .enum(['all', 'enabled', 'disabled'] as const)
    .optional()
    .default('all')
});

async function ensureAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const role = normalizeRole(session.user.role);
  if (role !== Role.ADMIN) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const auth = await ensureAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, { status: 400 });
  }

  const { page, pageSize, search, status, enabled } = parsed.data;

  const [list, summary] = await Promise.all([
    listAdminNewsSources({ page, pageSize, search, status, enabled }),
    getNewsSourceHealthSummary()
  ]);

  return NextResponse.json({
    sources: list.sources,
    pagination: list.pagination,
    summary: summary.totals,
    recentFailures: summary.recentFailures
  });
}

export async function POST(request: NextRequest) {
  const auth = await ensureAdmin(request);
  if (!auth.ok) {
    return auth.response;
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
