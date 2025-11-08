import { Status, Lang, IngestionStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/db/client';
import { classifyText } from '../lib/news/classifier';
import { generateUniqueArticleSlug } from '../lib/news/slugs';
import { translateWithCache } from '../lib/translation/provider';
import { predictTopics } from '../lib/news/topics';
import sanitizeHtml from 'sanitize-html';
import { sendAlertEmail } from '../lib/email/mailer';
import { enqueueJob, JOB_NAMES } from './queue';
import { buildBilingualSummaries } from '../lib/news/summarizer';
import { startCronHeartbeat, finishCronHeartbeat, recordAlertEvent } from '../lib/monitoring/heartbeat';
import { sendAlertSms } from '../lib/alerts/sms';
import { generateLongformArticle } from '../lib/news/longform';
import { getActiveNewsSources, updateNewsSourceIngestionStatus } from '../lib/db/sources';
import { fetchSourceFeed, normalizeRawItemToArticle } from '../lib/ingest/sources';

function buildExcerpt(text: string, length = 260) {
  if (!text) return '';
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= length) return normalized;
  return `${normalized.slice(0, length).trim()}…`;
}

type SourceFailure = { name: string; statusCode?: number; message: string };

type IngestionMetrics = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  pendingReview: number;
  sourcesAttempted: number;
  sourceFailures: SourceFailure[];
};

async function ingestSources(): Promise<IngestionMetrics> {
  const sources = await getActiveNewsSources();

  if (!sources.length) {
    console.warn('No active news sources configured; ingestion cycle skipped.');
    return {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      pendingReview: 0,
      sourcesAttempted: 0,
      sourceFailures: []
    };
  }

  const sourceFailures: SourceFailure[] = [];
  let totalFetched = 0;

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const tags = await prisma.tag.findMany({ select: { id: true, slug: true } });
  const categorySet = new Set(categories.map((category) => category.slug));
  const tagSet = new Set(tags.map((tag) => tag.slug));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const source of sources) {
    try {
      const result = await fetchSourceFeed({
        id: source.id,
        name: source.name,
        homepageUrl: source.homepageUrl,
        rssUrl: source.rssUrl ?? null,
        scrapeUrl: source.scrapeUrl ?? null,
        language: source.language
      });

      const fetchedAt = new Date();

      await updateNewsSourceIngestionStatus(source.id, {
        status: result.ok ? IngestionStatus.OK : IngestionStatus.ERROR,
        statusCode: result.statusCode ?? null,
        errorMessage: result.ok
          ? result.warnings.length
            ? result.warnings.join('; ')
            : null
          : result.errorMessage ?? null,
        fetchedAt
      });

      if (!result.ok) {
        sourceFailures.push({
          name: source.name,
          statusCode: result.statusCode,
          message: result.errorMessage
        });
        console.warn(
          `[ingestion] ${source.name} failed (${result.statusCode ?? 'unknown'}): ${result.errorMessage}`
        );
        continue;
      }

      totalFetched += result.items.length;
      for (const warning of result.warnings) {
        console.warn(`[ingestion] ${source.name} warning: ${warning}`);
      }

      for (const rawItem of result.items) {
        const normalized = await normalizeRawItemToArticle({ raw: rawItem, source });

        const existing = await prisma.article.findUnique({
          where: { urlCanonical: normalized.canonicalUrl },
          select: { id: true, slug: true, status: true }
        });

        if (existing && ![Status.REVIEWED, Status.DRAFT].includes(existing.status)) {
          skipped += 1;
          continue;
        }

        const articleStatus = source.isTrusted ? Status.REVIEWED : Status.DRAFT;

        const classification = classifyText(`${normalized.title} ${normalized.description}`);
        const categorySlugs = Array.from(
          new Set(classification.categories.filter((slug) => categorySet.has(slug)))
        );
        const tagSlugs = Array.from(
          new Set(classification.tags.filter((slug) => tagSet.has(slug)))
        );

        const excerpt = buildExcerpt(normalized.description);

        const longform = await generateLongformArticle({
          title: normalized.title,
          summary: normalized.description,
          rawHtml: normalized.contentHtml,
          language: normalized.language,
          sourceName: source.name,
          publishedAt: normalized.publishedAt
        });

        const fallbackParagraph = sanitizeHtml(normalized.description || normalized.contentHtml || '', {
          allowedTags: [],
          allowedAttributes: {}
        });

        const baseHtml = normalized.contentHtml?.trim()
          ? normalized.contentHtml
          : fallbackParagraph
          ? `<p>${fallbackParagraph}</p>`
          : '';

        const enrichedContentHtml = longform?.html ?? baseHtml;

        let titleFa: string | null = null;
        let excerptFa: string | null = null;
        let contentFa: string | null = null;
        let titleEn: string | null = null;
        let excerptEn: string | null = null;
        let contentEn: string | null = null;

        const plainExcerpt = sanitizeHtml(excerpt, { allowedTags: [], allowedAttributes: {} });
        const plainContent = sanitizeHtml(enrichedContentHtml || normalized.description, {
          allowedTags: [],
          allowedAttributes: {}
        });

        if (normalized.language === Lang.FA) {
          titleFa = normalized.title;
          excerptFa = excerpt;
          contentFa = enrichedContentHtml || baseHtml || null;

          if (!titleEn) {
            const { translated: translatedTitle } = await translateWithCache({
              text: normalized.title,
              sourceLang: Lang.FA,
              targetLang: Lang.EN
            });
            titleEn = translatedTitle ?? normalized.title;
          }

          if (!excerptEn) {
            const { translated: translatedExcerpt } = await translateWithCache({
              text: plainExcerpt,
              sourceLang: Lang.FA,
              targetLang: Lang.EN
            });
            excerptEn = translatedExcerpt ?? plainExcerpt ?? excerpt;
          }

          if (!contentEn && plainContent) {
            const { translated } = await translateWithCache({
              text: plainContent,
              sourceLang: Lang.FA,
              targetLang: Lang.EN
            });
            contentEn = translated ?? enrichedContentHtml ?? baseHtml ?? null;
          }
        } else {
          titleEn = normalized.title;
          excerptEn = excerpt;
          contentEn = enrichedContentHtml || baseHtml || null;

          if (!titleFa) {
            const { translated: translatedTitle } = await translateWithCache({
              text: normalized.title,
              sourceLang: Lang.EN,
              targetLang: Lang.FA
            });
            titleFa = translatedTitle ?? normalized.title;
          }

          if (!excerptFa) {
            const { translated: translatedExcerpt } = await translateWithCache({
              text: plainExcerpt,
              sourceLang: Lang.EN,
              targetLang: Lang.FA
            });
            excerptFa = translatedExcerpt ?? excerpt;
          }

          if (!contentFa && plainContent) {
            const { translated } = await translateWithCache({
              text: plainContent,
              sourceLang: Lang.EN,
              targetLang: Lang.FA
            });
            contentFa = translated ?? enrichedContentHtml ?? baseHtml ?? null;
          }
        }

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
        const fallbackPlain = sanitizeHtml(normalized.description ?? excerpt, {
          allowedTags: [],
          allowedAttributes: {}
        });

        const { summaryFa, summaryEn } = buildBilingualSummaries({
          persian: plainFaForSummary ?? fallbackPlain,
          english: plainEnForSummary ?? fallbackPlain
        });

        const finalSummaryFa = summaryFa || excerptFa || excerpt;
        const finalSummaryEn = summaryEn || excerptEn || excerpt;
        const baseContent = enrichedContentHtml || baseHtml || null;

        const categoryCreate = categorySlugs.map((slugValue) => ({
          category: { connect: { slug: slugValue } }
        }));
        const tagCreate = tagSlugs.map((slugValue) => ({
          tag: { connect: { slug: slugValue } }
        }));

        const articleFields = {
          titleFa: titleFa ?? normalized.title,
          titleEn: titleEn ?? normalized.title,
          excerptFa: excerptFa ?? excerpt,
          excerptEn: excerptEn ?? excerpt,
          summaryFa: finalSummaryFa,
          summaryEn: finalSummaryEn,
          contentFa: contentFa ?? baseContent,
          contentEn: contentEn ?? baseContent,
          coverImageUrl: normalized.coverImageUrl ?? null,
          language: normalized.language,
          status: articleStatus
        };

        if (existing) {
          await prisma.article.update({
            where: { id: existing.id },
            data: {
              ...articleFields,
              newsSource: { connect: { id: source.id } },
              categories: {
                deleteMany: {},
                ...(categoryCreate.length ? { create: categoryCreate } : {})
              },
              tags: {
                deleteMany: {},
                ...(tagCreate.length ? { create: tagCreate } : {})
              },
              topics: {
                deleteMany: {},
                ...(topicCreate.length ? { create: topicCreate } : {})
              },
              analytics: {
                upsert: {
                  update: {},
                  create: {}
                }
              }
            }
          });
          updated += 1;
          continue;
        }

        let slug = await generateUniqueArticleSlug(normalized.title, normalized.publishedAt);
        let attempts = 0;
        let createdSuccessfully = false;

        while (!createdSuccessfully && attempts < 5) {
          try {
            const createData: Prisma.ArticleCreateInput = {
              slug,
              urlCanonical: normalized.canonicalUrl,
              ...articleFields,
              newsSource: { connect: { id: source.id } },
              analytics: { create: {} }
            };

            if (categoryCreate.length) {
              createData.categories = { create: categoryCreate };
            }

            if (tagCreate.length) {
              createData.tags = { create: tagCreate };
            }

            if (topicCreate.length) {
              createData.topics = { create: topicCreate };
            }

            await prisma.article.create({ data: createData });
            created += 1;
            createdSuccessfully = true;
          } catch (error) {
            const prismaError = error as { code?: string; meta?: { target?: string[] } };
            if (prismaError?.code === 'P2002' && prismaError.meta?.target?.includes('slug')) {
              attempts += 1;
              slug = await generateUniqueArticleSlug(
                `${normalized.title}-${attempts}`,
                normalized.publishedAt
              );
              continue;
            }
            if (prismaError?.code === 'P2002' && prismaError.meta?.target?.includes('urlCanonical')) {
              skipped += 1;
              createdSuccessfully = true;
              continue;
            }
            console.error('Failed to insert article', error);
            createdSuccessfully = true;
          }
        }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      sourceFailures.push({ name: source.name, statusCode: undefined, message });
      console.error(`[ingestion] ${source.name} unexpected failure: ${message}`);
      await updateNewsSourceIngestionStatus(source.id, {
        status: IngestionStatus.ERROR,
        statusCode: null,
        errorMessage: message,
        fetchedAt: new Date()
      });
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

  if (sourceFailures.length) {
    await recordAlertEvent({
      channel: 'system',
      severity: 'warning',
      subject: 'برخی منابع خبری با خطا مواجه شدند',
      message: `${sourceFailures.length} منبع در اجرای اخیر جمع‌آوری با خطا مواجه شد`,
      metadata: sourceFailures
    });
  }

  return {
    fetched: totalFetched,
    created,
    updated,
    skipped,
    pendingReview: pendingReviewCount,
    sourcesAttempted: sources.length,
    sourceFailures
  };
}

export async function runIngestion() {
  const heartbeat = await startCronHeartbeat('ingestion');

  try {
    const result = await ingestSources();

    await finishCronHeartbeat(heartbeat.id, 'success', {
      startedAt: heartbeat.startedAt,
      message: {
        fetched: result.fetched,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        pendingReview: result.pendingReview,
        sourceFailures: result.sourceFailures,
        sources: result.sourcesAttempted
      }
    });

    return result;
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
