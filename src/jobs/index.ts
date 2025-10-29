import { Status, Lang } from '@prisma/client';
import { fetchNews } from './fetch-news';
import { ALLOWLISTED_SOURCES } from '@/lib/news/sources';
import { prisma } from '@/lib/db/client';
import { classifyText } from '@/lib/news/classifier';
import { generateUniqueArticleSlug } from '@/lib/news/slugs';
import { translateWithCache } from '@/lib/translation/provider';
import sanitizeHtml from 'sanitize-html';

function buildExcerpt(text: string, length = 260) {
  if (!text) return '';
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= length) return normalized;
  return `${normalized.slice(0, length).trim()}…`;
}

export async function runIngestion() {
  const articles = await fetchNews({
    sources: ALLOWLISTED_SOURCES.map(({ feedUrl, isTrusted, name, url }) => ({ feedUrl, isTrusted, name, url }))
  });

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

    let titleFa: string | null = null;
    let excerptFa: string | null = null;
    let contentFa: string | null = null;
    let titleEn: string | null = null;
    let excerptEn: string | null = null;
    let contentEn: string | null = null;

    if (article.language === Lang.FA) {
      titleFa = article.title;
      excerptFa = excerpt;
      contentFa = article.contentHtml;
    } else {
      titleEn = article.title;
      excerptEn = excerpt;
      contentEn = article.contentHtml;
      const plainContent = sanitizeHtml(article.contentHtml || article.description, {
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
    }

    try {
      await prisma.article.create({
        data: {
          slug,
          urlCanonical: article.canonicalUrl,
          titleFa: titleFa ?? article.title,
          titleEn: titleEn ?? article.title,
          excerptFa: excerptFa ?? excerpt,
          excerptEn: excerptEn ?? excerpt,
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
          }
        }
      });
      created += 1;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        skipped += 1;
      } else {
        console.error('Failed to insert article', error);
      }
    }
  }

  return {
    fetched: articles.length,
    created,
    skipped
  };
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
