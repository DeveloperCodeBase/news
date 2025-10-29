import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Status } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';
import { sendNewsletterDigest } from '@/lib/email/mailer';

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
        select: { slug: true, titleFa: true, titleEn: true, excerptFa: true, excerptEn: true, publishedAt: true }
      })
    : await prisma.article.findMany({
        where: { status: Status.PUBLISHED },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { slug: true, titleFa: true, titleEn: true, excerptFa: true, excerptEn: true, publishedAt: true }
      });

  if (articles.length === 0) {
    return NextResponse.json({ error: 'No articles available' }, { status: 400 });
  }

  const intro = parsed.data.intro ?? 'جدیدترین خبرهای هوش مصنوعی از مجله ویستا';
  const htmlList = articles
    .map(
      (article) =>
        `<li><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir'}/fa/news/${article.slug}"><strong>${
          article.titleFa ?? article.titleEn
        }</strong></a><br/><small>${new Date(article.publishedAt).toLocaleDateString('fa-IR')}</small><p>${
          article.excerptFa ?? article.excerptEn ?? ''
        }</p></li>`
    )
    .join('');

  const html = `<h1>${parsed.data.subject}</h1><p>${intro}</p><ol>${htmlList}</ol>`;
  const text = `${parsed.data.subject}\n${intro}\n${articles
    .map((article) => `${article.titleFa ?? article.titleEn} - ${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir'}/fa/news/${article.slug}`)
    .join('\n')}`;

  await sendNewsletterDigest({
    subject: parsed.data.subject,
    html,
    text,
    recipients: parsed.data.recipients
  });

  return NextResponse.json({ sent: true });
}
