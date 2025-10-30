import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';

const createSourceSchema = z.object({
  name: z.string().min(3),
  url: z.string().url(),
  feedUrl: z.string().url(),
  isTrusted: z.boolean().optional().default(true),
  priority: z.number().int().min(1).max(99).optional()
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const json = await request.json();
  const parsed = createSourceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const source = await prisma.source.create({
    data: {
      name: parsed.data.name,
      url: parsed.data.url,
      feedUrl: parsed.data.feedUrl,
      isTrusted: parsed.data.isTrusted,
      priority: parsed.data.priority ?? 10
    }
  });

  return NextResponse.json({ created: true, source }, { status: 201 });
}
