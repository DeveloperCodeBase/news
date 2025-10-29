import Parser from 'rss-parser';
import metascraper from 'metascraper';
import metascraperAuthor from 'metascraper-author';
import metascraperDate from 'metascraper-date';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';
import sanitizeHtml from 'sanitize-html';
import { setTimeout as setTimer, clearTimeout } from 'node:timers';
import { Lang } from '@prisma/client';

const parser = new Parser({ timeout: 20000 });

const metascraperInstance = metascraper([
  metascraperAuthor(),
  metascraperDate(),
  metascraperDescription(),
  metascraperImage(),
  metascraperTitle(),
  metascraperUrl()
]);

export type FetchNewsOptions = {
  sources: Array<{ feedUrl: string; isTrusted: boolean; name: string; url: string }>;
};

export type NormalizedArticle = {
  title: string;
  description: string;
  contentHtml: string;
  publishedAt: Date;
  canonicalUrl: string;
  coverImageUrl?: string;
  source: {
    name: string;
    url: string;
    feedUrl: string;
    isTrusted: boolean;
  };
  language: Lang;
};

function detectLanguage(text: string): Lang {
  const persianRegex = /[\u0600-\u06FF]/;
  return persianRegex.test(text) ? Lang.FA : Lang.EN;
}

async function fetchArticleHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimer(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch article ${url}: ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchNews({ sources }: FetchNewsOptions): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.feedUrl);
      for (const item of feed.items ?? []) {
        const link = item.link?.trim();
        if (!link) continue;

        const rawTitle = (item.title ?? '').trim();
        const rawDescription = (item.contentSnippet ?? item.summary ?? '').trim();
        const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date();

        let html = '';
        try {
          html = await fetchArticleHtml(link);
        } catch (error) {
          console.warn(`Failed fetching article HTML for ${link}`, error);
        }

        let metadata: Record<string, any> = {};
        if (html) {
          metadata = await metascraperInstance({ html, url: link });
        }

        const title = metadata.title || rawTitle;
        const description = metadata.description || rawDescription;
        const richContent =
          (item['content:encoded'] as string | undefined) ?? metadata.html ?? html ?? rawDescription;
        const sanitizedContent = sanitizeHtml(richContent ?? '', {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption']),
          allowedAttributes: {
            img: ['src', 'alt', 'width', 'height'],
            a: ['href', 'rel', 'target']
          }
        });

        const language = detectLanguage(`${title} ${description}`);

        articles.push({
          title,
          description,
          contentHtml: sanitizedContent,
          publishedAt,
          canonicalUrl: metadata.url || link,
          coverImageUrl: metadata.image || item.enclosure?.url,
          source: {
            name: source.name,
            url: source.url,
            feedUrl: source.feedUrl,
            isTrusted: source.isTrusted
          },
          language
        });
      }
    } catch (error) {
      console.error(`Failed to parse feed ${source.feedUrl}`, error);
    }
  }

  return articles;
}
