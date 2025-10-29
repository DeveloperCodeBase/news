import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { JOB_NAMES, enqueueJob } from '@/jobs/queue';
import { getEnv } from '@/lib/env';
import { isEditorialRole } from '@/lib/auth/permissions';
import { authOptions } from '@/lib/auth/options';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const env = getEnv();
  const tokenHeader = request.headers.get('authorization');

  if (tokenHeader === `Bearer ${env.INTERNAL_API_TOKEN}`) {
    await enqueueJob(JOB_NAMES.INGEST, { triggeredBy: 'service' });
    return NextResponse.json({ enqueued: true, via: 'service-token' });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.role || !isEditorialRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await enqueueJob(JOB_NAMES.INGEST, { triggeredBy: session.user.email ?? 'unknown' });
  return NextResponse.json({ enqueued: true });
}
