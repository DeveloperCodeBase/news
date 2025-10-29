import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const env = getEnv();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 });
  }

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug : null;

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  revalidatePath('/');
  revalidatePath('/fa');
  revalidatePath('/en');
  revalidatePath('/fa/news');
  revalidatePath('/en/news');
  revalidatePath(`/fa/news/${slug}`);
  revalidatePath(`/en/news/${slug}`);

  return NextResponse.json({ revalidated: true, slug });
}
