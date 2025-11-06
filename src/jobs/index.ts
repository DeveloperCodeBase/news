import { Status, Lang } from '@prisma/client';
import { fetchNews } from './fetch-news';
import { ALLOWLISTED_SOURCES } from '@/lib/news/sources';
import { prisma } from '@/lib/db/client';
import { classifyText } from '@/lib/news/classifier';
import { generateUniqueArticleSlug } from '@/lib/news/slugs';
import { translateWithCache } from '@/lib/translation/provider';
import { predictTopics } from '@/lib/news/topics';
import sanitizeHtml from 'sanitize-html';
import { sendAlertEmail } from '@/lib/email/mailer';
import { enqueueJob, JOB_NAMES } from './queue';
import { buildBilingualSummaries } from '@/lib/news/summarizer';
import { startCronHeartbeat, finishCronHeartbeat, recordAlertEvent } from '@/lib/monitoring/heartbeat';
import { sendAlertSms } from '@/lib/alerts/sms';
import { generateLongformArticle } from '@/lib/news/longform';

function buildExcerpt(text: string, length = 260) {
  if (!text) return '';
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= length) return normalized;
  return `${normalized.slice(0, length).trim()}…`;
}

export async function runIngestion() {
  const heartbeat = await startCronHeartbeat('ingestion');
  try {
    const dbSources = await prisma.source.findMany({
      where: { active: true, blacklisted: false },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, feedUrl: true, isTrusted: true, name: true, url: true }
    });

    const sourcesToFetch = dbSources.length
      ? dbSources.map(({ feedUrl, isTrusted, name, url }) => ({ feedUrl, isTrusted, name, url }))
      : ALLOWLISTED_SOURCES;

    const articles = await fetchNews({ sources: sourcesToFetch });

    if (dbSources.length) {
      const now = new Date();
      await prisma.source.updateMany({
        where: { id: { in: dbSources.map((source) => source.id) } },
        data: { lastFetchedAt: now }
      });
    }

    const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
    const tags = await prisma.tag.findMany({ select: { id: true, slug: true } });
    const categorySet = new Set(categories.map((category) => category.slug));
    const tagSet = new Set(tags.map((tag) => tag.slug));

    let created = 0;
    let skipped = 0;

    for (const article of articles) {
      const existing = await prisma.article.findUnique({ where: { urlCanonical: article.canonicalUrl } });
      if (existing) {
        skipped += 1;
        continue;
      }

      const slug = await generateUniqueArticleSlug(article.title, article.publishedAt);
      const status = article.source.isTrusted ? Status.PUBLISHED : Status.REVIEWED;

      const classification = classifyText(`${article.title} ${article.description}`);
      const categorySlugs = Array.from(new Set(classification.categories.filter((slug) => categorySet.has(slug))));
      const tagSlugs = Array.from(new Set(classification.tags.filter((slug) => tagSet.has(slug))));

      const excerpt = buildExcerpt(article.description);

      const longform = await generateLongformArticle({
        title: article.title,
        summary: article.description,
        rawHtml: article.contentHtml,
        language: article.language,
        sourceName: article.source.name,
        publishedAt: article.publishedAt
      });

      const enrichedContentHtml = longform?.html ?? article.contentHtml;

      let titleFa: string | null = null;
      let excerptFa: string | null = null;
      let contentFa: string | null = null;
      let titleEn: string | null = null;
      let excerptEn: string | null = null;
      let contentEn: string | null = null;

      if (article.language === Lang.FA) {
        titleFa = article.title;
        excerptFa = excerpt;
        contentFa = enrichedContentHtml;
      } else {
        titleEn = article.title;
        excerptEn = excerpt;
        contentEn = enrichedContentHtml;
        const plainContent = sanitizeHtml(enrichedContentHtml || article.description, {
          allowedTags: [],
          allowedAttributes: {}
        });
        const plainExcerpt = sanitizeHtml(excerpt, { allowedTags: [], allowedAttributes: {} });
        const { translated } = await translateWithCache({ text: plainContent, sourceLang: Lang.EN, targetLang: Lang.FA });
        if (translated) {
          contentFa = translated;
          const { translated: translatedTitle } = await translateWithCache({ text: article.title, sourceLang: Lang.EN, targetLang: Lang.FA });
          titleFa = translatedTitle ?? article.title;
          const { translated: translatedExcerpt } = await translateWithCache({ text: plainExcerpt, sourceLang: Lang.EN, targetLang: Lang.FA });
          excerptFa = translatedExcerpt ?? excerpt;
        } else {
          titleFa = article.title;
          excerptFa = excerpt;
          contentFa = article.contentHtml;
        }
      }

      if (!titleEn && article.language === Lang.FA) {
        const { translated: translatedTitle } = await translateWithCache({ text: article.title, sourceLang: Lang.FA, targetLang: Lang.EN });
        titleEn = translatedTitle ?? null;
        const plainExcerpt = sanitizeHtml(excerpt, { allowedTags: [], allowedAttributes: {} });
        const { translated: translatedExcerpt } = await translateWithCache({ text: plainExcerpt, sourceLang: Lang.FA, targetLang: Lang.EN });
        excerptEn = translatedExcerpt ?? null;
        if (!contentEn && contentFa) {
          const plainFaContent = sanitizeHtml(contentFa, { allowedTags: [], allowedAttributes: {} });
          const { translated: translatedContent } = await translateWithCache({
            text: plainFaContent,
            sourceLang: Lang.FA,
            targetLang: Lang.EN
          });
          contentEn = translatedContent ?? null;
        }
      }

      try {
        const topicPlainText = sanitizeHtml(
          `${contentFa ?? ''} ${contentEn ?? ''}`,
          { allowedTags: [], allowedAttributes: {} }
        );
        const topicPredictions = await predictTopics(
          `${titleFa ?? titleEn ?? ''} ${excerptFa ?? excerptEn ?? ''} ${topicPlainText}`
        );
        const topicCreate = topicPredictions
          .slice(0, 6)
          .map((topic) => ({ label: topic.label, score: topic.score, source: topic.source }));

        const plainFaForSummary = contentFa
          ? sanitizeHtml(contentFa, { allowedTags: [], allowedAttributes: {} })
          : undefined;
        const plainEnForSummary = contentEn
          ? sanitizeHtml(contentEn, { allowedTags: [], allowedAttributes: {} })
          : undefined;
        const fallbackPlain = sanitizeHtml(article.description ?? excerpt, {
          allowedTags: [],
          allowedAttributes: {}
        });

        const { summaryFa, summaryEn } = buildBilingualSummaries({
          persian: plainFaForSummary ?? fallbackPlain,
          english: plainEnForSummary ?? fallbackPlain
        });

        const finalSummaryFa = summaryFa || excerptFa || excerpt;
        const finalSummaryEn = summaryEn || excerptEn || excerpt;

        await prisma.article.create({
          data: {
            slug,
            urlCanonical: article.canonicalUrl,
            titleFa: titleFa ?? article.title,
            titleEn: titleEn ?? article.title,
            excerptFa: excerptFa ?? excerpt,
            excerptEn: excerptEn ?? excerpt,
            summaryFa: finalSummaryFa,
            summaryEn: finalSummaryEn,
            contentFa: contentFa ?? article.contentHtml,
            contentEn: contentEn ?? article.contentHtml,
            coverImageUrl: article.coverImageUrl,
            language: article.language,
            source: {
              connectOrCreate: {
                where: { feedUrl: article.source.feedUrl },
                create: {
                  name: article.source.name,
                  url: article.source.url,
                  feedUrl: article.source.feedUrl,
                  isTrusted: article.source.isTrusted
                }
              }
            },
            status,
            publishedAt: article.publishedAt,
            categories: {
              create: categorySlugs.map((slugValue) => ({
                category: { connect: { slug: slugValue } }
              }))
            },
            tags: {
              create: tagSlugs.map((slugValue) => ({
                tag: { connect: { slug: slugValue } }
              }))
            },
            ...(topicCreate.length
              ? {
                  topics: {
                    create: topicCreate
                  }
                }
              : {}),
            analytics: {
              create: {}
            }
          }
        });
        created += 1;
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
          skipped += 1;
        } else {
          console.error('Failed to insert article', error);
        }
      }
    }

    const pendingReviewCount = await prisma.article.count({
      where: { status: { in: [Status.REVIEWED, Status.DRAFT] } }
    });

    if (created > 0) {
      await enqueueJob(
        JOB_NAMES.TREND_REFRESH,
        {},
        { singletonKey: 'trend-refresh', singletonMinutes: 30 }
      );
    }

    await finishCronHeartbeat(heartbeat.id, 'success', {
      startedAt: heartbeat.startedAt,
      message: {
        fetched: articles.length,
        created,
        skipped,
        pendingReview: pendingReviewCount
      }
    });

    return {
      fetched: articles.length,
      created,
      skipped,
      pendingReview: pendingReviewCount
    };
  } catch (error) {
    console.error('Ingestion failed', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await finishCronHeartbeat(heartbeat.id, 'error', {
      startedAt: heartbeat.startedAt,
      message: errorMessage
    });
    await sendAlertEmail({
      subject: 'Hoosh Gate ingestion failed',
      html: `<p>خطا در اجرای پایپلاین جمع‌آوری اخبار:</p><pre>${errorMessage}</pre>`
    });
    await recordAlertEvent({
      channel: 'system',
      severity: 'critical',
      subject: 'خطای پایپلاین جمع‌آوری خبر',
      message: errorMessage,
      metadata: { source: 'runIngestion' }
    });
    await sendAlertSms({
      subject: 'اخطار پایپلاین خبر هوش گیت',
      message: `پایپلاین جمع‌آوری خبر با خطا مواجه شد: ${errorMessage}`
    });
    throw error;
  }
}

if (import.meta.url === `file://${__filename}`) {
  runIngestion()
    .then((result) => {
      console.log('Ingestion completed', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ingestion failed', error);
      process.exit(1);
    });
}
