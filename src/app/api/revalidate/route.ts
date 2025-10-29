import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { JOB_NAMES, enqueueJob } from '@/jobs/queue';
import { isEditorialRole, normalizeRole } from '@/lib/auth/permissions';
import type { Database } from '@/types/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug : null;

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  await enqueueJob(JOB_NAMES.REVALIDATE, { slug });
  return NextResponse.json({ enqueued: true });
}
