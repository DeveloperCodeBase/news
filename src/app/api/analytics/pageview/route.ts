import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import crypto from 'crypto';

const payloadSchema = z.object({
  articleId: z.string().min(1),
  readTimeMs: z.number().int().min(0).optional(),
  completion: z.number().min(0).max(1).optional(),
  visitorId: z.string().max(128).optional()
});

function buildFingerprint(articleId: string, request: NextRequest, provided?: string) {
  if (provided) {
    return provided;
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.ip ?? 'unknown';
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  return crypto.createHash('sha256').update(`${articleId}:${ip}:${userAgent}`).digest('hex');
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { articleId, readTimeMs = 0, completion = 0, visitorId } = parsed.data;
  const fingerprint = buildFingerprint(articleId, request, visitorId);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    let isUnique = false;
    try {
      await tx.articleViewFingerprint.create({
        data: { articleId, fingerprint }
      });
      isUnique = true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        isUnique = false;
      } else {
        throw error;
      }
    }

    const existing = await tx.articleAnalytics.findUnique({ where: { articleId } });

    if (!existing) {
      await tx.articleAnalytics.create({
        data: {
          articleId,
          totalViews: 1,
          uniqueVisitors: 1,
          totalReadTimeMs: readTimeMs,
          totalCompletion: completion,
          avgReadTimeMs: readTimeMs,
          avgCompletion: completion,
          lastViewedAt: now
        }
      });
      return;
    }

    const totalViews = existing.totalViews + 1;
    const totalReadTime = existing.totalReadTimeMs + readTimeMs;
    const totalCompletion = existing.totalCompletion + completion;
    const uniqueVisitors = existing.uniqueVisitors + (isUnique ? 1 : 0);
    const avgRead = totalViews > 0 ? Math.round(totalReadTime / totalViews) : 0;
    const avgCompletion = totalViews > 0 ? totalCompletion / totalViews : 0;

    await tx.articleAnalytics.update({
      where: { articleId },
      data: {
        totalViews,
        uniqueVisitors,
        totalReadTimeMs: totalReadTime,
        totalCompletion,
        avgReadTimeMs: avgRead,
        avgCompletion,
        lastViewedAt: now
      }
    });
  });

  return NextResponse.json({ recorded: true });
}
