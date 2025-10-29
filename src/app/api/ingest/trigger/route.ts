import { NextRequest, NextResponse } from 'next/server';
import { runIngestion } from '@/jobs';
import { getEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const env = getEnv();
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await runIngestion();
  return NextResponse.json({ status: 'completed', ...result });
}
