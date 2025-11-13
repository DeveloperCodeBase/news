import type { Prisma } from '@prisma/client';
import { Lang, Status } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { prisma } from '@/lib/db/client';
import { translateWithCache } from '@/lib/translation/provider';
import {
  combineFaTranslationMeta,
  createFieldState,
  parseFaTranslationMeta
} from '@/lib/translation/meta';
import type { ArticleFaTranslationMeta } from '@/lib/translation/meta';

const BATCH_SIZE = 25;

async function backfillTranslations() {
  const articles = await prisma.article.findMany({
    where: {
      language: Lang.EN,
      status: { in: [Status.DRAFT, Status.REVIEWED, Status.SCHEDULED, Status.PUBLISHED] }
    },
    orderBy: { updatedAt: 'asc' },
    take: BATCH_SIZE,
    select: {
      id: true,
      titleEn: true,
      titleFa: true,
      excerptEn: true,
      excerptFa: true,
      contentEn: true,
      contentFa: true,
      faTranslationMeta: true
    }
  });

  if (!articles.length) {
    console.log('No English articles found for translation backfill.');
    return;
  }

  let translatedCount = 0;
  for (const article of articles) {
    const meta = parseFaTranslationMeta(article.faTranslationMeta ?? null);
    const updates: Prisma.ArticleUpdateInput = {};
    const metaUpdates: Partial<ArticleFaTranslationMeta> = {};

    const needsTitle = meta.title.status === 'fallback' || !article.titleFa || article.titleFa === article.titleEn;
    const needsExcerpt = meta.excerpt.status === 'fallback' || !article.excerptFa || article.excerptFa === article.excerptEn;
    const needsContent = meta.content.status === 'fallback' || !article.contentFa || article.contentFa === article.contentEn;

    if (!needsTitle && !needsExcerpt && !needsContent) {
      continue;
    }

    if (needsTitle && article.titleEn) {
      const result = await translateWithCache(
        {
          text: article.titleEn,
          sourceLang: Lang.EN,
          targetLang: Lang.FA
        },
        { bypassCache: false, persist: true }
      );
      if (result.translated) {
        updates.titleFa = result.translated;
        metaUpdates.title = createFieldState('translated', result.providerId, null, new Date());
      } else {
        metaUpdates.title = createFieldState('fallback', result.providerId, result.error ?? 'translation-failed', new Date());
      }
    }

    if (needsExcerpt && article.excerptEn) {
      const result = await translateWithCache(
        {
          text: article.excerptEn,
          sourceLang: Lang.EN,
          targetLang: Lang.FA
        },
        { bypassCache: false, persist: true }
      );
      if (result.translated) {
        updates.excerptFa = result.translated;
        metaUpdates.excerpt = createFieldState('translated', result.providerId, null, new Date());
      } else {
        metaUpdates.excerpt = createFieldState('fallback', result.providerId, result.error ?? 'translation-failed', new Date());
      }
    }

    if (needsContent && article.contentEn) {
      const plain = sanitizeHtml(article.contentEn, { allowedTags: [], allowedAttributes: {} });
      if (plain.trim()) {
        const result = await translateWithCache(
          {
            text: plain,
            sourceLang: Lang.EN,
            targetLang: Lang.FA
          },
          { bypassCache: false, persist: true }
        );
        if (result.translated) {
          updates.contentFa = result.translated;
          metaUpdates.content = createFieldState('translated', result.providerId, null, new Date());
        } else {
          metaUpdates.content = createFieldState('fallback', result.providerId, result.error ?? 'translation-failed', new Date());
        }
      }
    }

    if (Object.keys(updates).length === 0 && Object.keys(metaUpdates).length === 0) {
      continue;
    }

    const mergedMeta = combineFaTranslationMeta(meta, metaUpdates);

    await prisma.article.update({
      where: { id: article.id },
      data: {
        ...updates,
        faTranslationMeta: mergedMeta
      }
    });

    translatedCount += 1;
  }

  console.log(`Translation backfill completed. Updated ${translatedCount} articles.`);
}

if (import.meta.url === `file://${__filename}`) {
  backfillTranslations()
    .then(() => {
      console.log('Backfill job finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backfill job failed', error);
      process.exit(1);
    });
}

export { backfillTranslations };
