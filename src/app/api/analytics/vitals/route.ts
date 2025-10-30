import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';

const payloadSchema = z.object({
  metric: z.string().min(1),
  value: z.number(),
  rating: z.string().min(1),
  delta: z.number().optional(),
  navigationType: z.string().optional(),
  route: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.coreWebVital.create({ data: parsed.data });

  return NextResponse.json({ recorded: true });
}
