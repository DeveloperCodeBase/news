import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { JOB_NAMES, enqueueJob } from '@/jobs/queue';
import { isEditorialRole } from '@/lib/auth/permissions';
import { authOptions } from '@/lib/auth/options';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.role || !isEditorialRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug : null;

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  await enqueueJob(JOB_NAMES.REVALIDATE, { slug });
  return NextResponse.json({ enqueued: true });
}
