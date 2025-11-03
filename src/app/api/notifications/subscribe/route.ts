import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(16),
    auth: z.string().min(16)
  })
});

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth }
  });

  return NextResponse.json({ saved: true });
}
