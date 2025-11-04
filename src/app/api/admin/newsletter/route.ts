import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Status } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';
import { sendEmail, sendNewsletterDigest } from '@/lib/email/mailer';
import { getEnv } from '@/lib/env';
import { resolveExperimentVariant } from '@/lib/experiments/assignment';
import { renderNewsletterTemplate } from '@/lib/newsletter/templates';

const newsletterSchema = z.object({
  subject: z.string().min(5),
  articleIds: z.array(z.string()).optional(),
  recipients: z.array(z.string().email()).optional(),
  intro: z.string().optional()
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const json = await request.json();
  const parsed = newsletterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const articles = parsed.data.articleIds?.length
    ? await prisma.article.findMany({
        where: { id: { in: parsed.data.articleIds } },
        select: {
          slug: true,
          titleFa: true,
          titleEn: true,
          excerptFa: true,
          excerptEn: true,
          summaryFa: true,
          summaryEn: true,
          publishedAt: true
        }
      })
    : await prisma.article.findMany({
        where: { status: Status.PUBLISHED },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: {
          slug: true,
          titleFa: true,
          titleEn: true,
          excerptFa: true,
          excerptEn: true,
          summaryFa: true,
          summaryEn: true,
          publishedAt: true
        }
      });

  if (articles.length === 0) {
    return NextResponse.json({ error: 'No articles available' }, { status: 400 });
  }

  const intro = parsed.data.intro ?? 'جدیدترین خبرهای هوش مصنوعی از مجله هوش گیت';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hooshgate.ir';
  const env = getEnv();
  const resolvedRecipients = parsed.data.recipients?.length
    ? parsed.data.recipients
    : env.NEWSLETTER_RECIPIENTS?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];

  const experiment = await prisma.experiment.findUnique({
    where: { key: 'newsletter-template' },
    include: { variants: true }
  });

  if (!experiment || experiment.status !== 'RUNNING' || experiment.variants.length === 0 || resolvedRecipients.length === 0) {
    const rendered = renderNewsletterTemplate('minimal', { subject: parsed.data.subject, intro, siteUrl, articles });
    await sendNewsletterDigest({
      subject: parsed.data.subject,
      html: rendered.html,
      text: rendered.text,
      recipients: resolvedRecipients
    });
    return NextResponse.json({ sent: true, variant: 'minimal' });
  }

  const variantBuckets = new Map<
    string,
    { variantId: string; templateKey: 'minimal' | 'story'; recipients: string[] }
  >();

  for (const recipient of resolvedRecipients) {
    const assignment = await resolveExperimentVariant('newsletter-template', recipient);
    if (!assignment) continue;
    const templateKey = (assignment.templatePath as 'minimal' | 'story') ?? (assignment.key === 'story' ? 'story' : 'minimal');
    const existing = variantBuckets.get(assignment.key) ?? {
      variantId: assignment.variantId,
      templateKey,
      recipients: []
    };
    existing.recipients.push(recipient);
    variantBuckets.set(assignment.key, existing);
  }

  for (const bucket of variantBuckets.values()) {
    if (bucket.recipients.length === 0) continue;
    const rendered = renderNewsletterTemplate(bucket.templateKey, {
      subject: parsed.data.subject,
      intro,
      siteUrl,
      articles
    });
    await sendEmail({
      to: bucket.recipients,
      subject: parsed.data.subject,
      html: rendered.html,
      text: rendered.text
    });
    await prisma.experimentMetric.create({
      data: {
        experimentId: experiment.id,
        variantId: bucket.variantId,
        metric: 'newsletter.sent',
        value: bucket.recipients.length
      }
    });
  }

  return NextResponse.json({ sent: true, variants: Array.from(variantBuckets.keys()) });
}
