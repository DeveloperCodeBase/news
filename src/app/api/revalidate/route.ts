import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  // Placeholder for on-demand revalidation logic
  return NextResponse.json({ revalidated: true });
}
