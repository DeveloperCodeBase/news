import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { JOB_NAMES, enqueueJob } from '@/jobs/queue';
import { getEnv } from '@/lib/env';
import { isEditorialRole, normalizeRole } from '@/lib/auth/permissions';
import type { Database } from '@/types/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const env = getEnv();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey) {
    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${serviceKey}`) {
      await enqueueJob(JOB_NAMES.INGEST, { triggeredBy: 'service' });
      return NextResponse.json({ enqueued: true, via: 'service-key' });
    }
  }

  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = normalizeRole(session.user.user_metadata?.role);

  if (!role || !isEditorialRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await enqueueJob(JOB_NAMES.INGEST, { triggeredBy: session.user.id });
  return NextResponse.json({ enqueued: true });
}
