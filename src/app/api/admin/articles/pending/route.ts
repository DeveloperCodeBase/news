import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Status, Lang } from '@prisma/client';
import { authOptions } from '@/lib/auth/options';
import { isEditorialRole } from '@/lib/auth/permissions';
import {
  getReviewQueueSnapshot,
  type ReviewQueueSortDirection,
  type ReviewQueueSortField
} from '@/lib/db/articles';

const SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'publishedAt',
  'source',
  'language',
  'status',
  'category',
  'topic',
  'aiScore'
] as const satisfies readonly ReviewQueueSortField[];

const querySchema = z.object({
  status: z.string().optional(),
  language: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(5).max(100).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.string().optional()
});

function parseStatuses(value?: string | null): Status[] {
  if (!value) {
    return [Status.REVIEWED, Status.DRAFT];
  }
  const candidates = value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean) as Status[];
  const allowed = new Set<Status>([Status.REVIEWED, Status.DRAFT, Status.SCHEDULED]);
  const filtered = candidates.filter((item) => allowed.has(item));
  return filtered.length ? filtered : [Status.REVIEWED, Status.DRAFT];
}

function parseLanguage(value?: string | null): Lang | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'FA') return Lang.FA;
  if (normalized === 'EN') return Lang.EN;
  return undefined;
}

function parseSortField(value?: string | null): ReviewQueueSortField {
  if (!value) {
    return 'createdAt';
  }
  const normalized = value.trim() as ReviewQueueSortField;
  return SORT_FIELDS.includes(normalized) ? normalized : 'createdAt';
}

function parseSortDirection(value?: string | null): ReviewQueueSortDirection {
  if (!value) {
    return 'desc';
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'asc' ? 'asc' : 'desc';
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.role || !isEditorialRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parseResult = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid query', details: parseResult.error.flatten() }, { status: 400 });
  }

  const { status, language, search, page, pageSize, sortBy, sortDirection } = parseResult.data;
  const statuses = parseStatuses(status);
  const languageFilter = language && language !== 'all' ? parseLanguage(language) : undefined;
  const resolvedSortBy = parseSortField(sortBy);
  const resolvedSortDirection = parseSortDirection(sortDirection);

  const snapshot = await getReviewQueueSnapshot({
    statuses,
    language: languageFilter,
    search,
    page,
    pageSize,
    sortBy: resolvedSortBy,
    sortDirection: resolvedSortDirection
  });

  return NextResponse.json(snapshot);
}
