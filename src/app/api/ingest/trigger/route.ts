import { NextRequest, NextResponse } from 'next/server';
import { runIngestion } from '@/jobs';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  // TODO: replace with Supabase Auth guard
  const result = await runIngestion();
  return NextResponse.json({ status: 'completed', ...result });
}
