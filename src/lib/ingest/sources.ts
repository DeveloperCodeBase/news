import Parser from 'rss-parser';
import metascraper from 'metascraper';
import metascraperAuthor from 'metascraper-author';
import metascraperDate from 'metascraper-date';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';
import sanitizeHtml from 'sanitize-html';
import { Lang, NewsSource } from '@prisma/client';

export type RawSourceItem = {
  title: string;
  url: string;
  summary?: string;
  content?: string;
  image?: string;
  author?: string;
  publishedAt?: Date;
  languageGuess?: Lang;
};

export type FetchSourceSuccess = {
  ok: true;
  items: RawSourceItem[];
  statusCode?: number;
  warnings: string[];
};

export type FetchSourceFailure = {
  ok: false;
  items: RawSourceItem[];
  statusCode?: number;
  errorMessage: string;
};

export type FetchSourceResult = FetchSourceSuccess | FetchSourceFailure;

export type NormalizedArticleInput = {
  raw: RawSourceItem;
  source: Pick<NewsSource, 'id' | 'name' | 'homepageUrl' | 'rssUrl' | 'language' | 'isTrusted'>;
};

const parser = new Parser({ timeout: 20000 });

const metascraperInstance = metascraper([
  metascraperAuthor(),
  metascraperDate(),
  metascraperDescription(),
  metascraperImage(),
  metascraperTitle(),
  metascraperUrl()
]);

type FetchImpl = typeof fetch;

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

async function fetchWithHeaders(url: string, fetchImpl: FetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetchImpl(url, {
      headers: DEFAULT_HEADERS,
      redirect: 'follow',
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function detectLanguage(text: string, fallback: Lang): Lang {
  const persianRegex = /[\u0600-\u06FF]/;
  if (persianRegex.test(text)) return Lang.FA;
  return fallback;
}

async function parseRssFeed(
  url: string,
  fetchImpl: FetchImpl
): Promise<FetchSourceResult> {
  try {
    const response = await fetchWithHeaders(url, fetchImpl);
    if (!response.ok) {
      return {
        ok: false,
        items: [],
        statusCode: response.status,
        errorMessage: `Failed to fetch RSS (${response.status})`
      };
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);
    const items: RawSourceItem[] = [];

    for (const entry of feed.items ?? []) {
      const link = entry.link?.trim();
      if (!link) continue;
      const title = (entry.title ?? '').trim();
      const summary = (entry.contentSnippet ?? entry.summary ?? '').trim();
      const publishedAt = entry.isoDate ? new Date(entry.isoDate) : undefined;

      items.push({
        title,
        url: link,
        summary,
        image: entry.enclosure?.url,
        author: typeof entry.author === 'string' ? entry.author : undefined,
        publishedAt
      });
    }

    return { ok: true, items, statusCode: response.status, warnings: [] };
  } catch (error) {
    return {
      ok: false,
      items: [],
      statusCode: undefined,
      errorMessage: error instanceof Error ? error.message : 'Unknown RSS error'
    };
  }
}

const linkPattern = /<a\s+(?:[^>]*?\s+)?href="([^"]+)"[^>]*>(.*?)<\/a>/gi;

async function fetchAndParseHtmlListing(
  url: string,
  fetchImpl: FetchImpl
): Promise<FetchSourceResult> {
  try {
    const response = await fetchWithHeaders(url, fetchImpl);
    if (!response.ok) {
      return {
        ok: false,
        items: [],
        statusCode: response.status,
        errorMessage: `Failed to fetch listing HTML (${response.status})`
      };
    }

    const html = await response.text();
    const matches = Array.from(html.matchAll(linkPattern));
    const seen = new Set<string>();
    const candidates: RawSourceItem[] = [];

    for (const match of matches) {
      const href = match[1];
      const text = match[2] ?? '';
      if (!href?.startsWith('http')) continue;
      if (seen.has(href)) continue;
      seen.add(href);
      const title = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();
      if (!title) continue;
      candidates.push({ title, url: href, summary: undefined });
      if (candidates.length >= 25) break;
    }

    const enriched: RawSourceItem[] = [];
    for (const candidate of candidates) {
      try {
        const articleResponse = await fetchWithHeaders(candidate.url, fetchImpl);
        if (!articleResponse.ok) {
          enriched.push(candidate);
          continue;
        }
        const articleHtml = await articleResponse.text();
        const metadata = await metascraperInstance({ html: articleHtml, url: candidate.url });
        enriched.push({
          title: metadata.title || candidate.title,
          url: metadata.url || candidate.url,
          summary: metadata.description ?? candidate.summary,
          image: metadata.image ?? undefined,
          author: metadata.author ?? undefined,
          publishedAt: metadata.date ? new Date(metadata.date) : undefined,
          content: metadata.html ?? undefined
        });
      } catch (error) {
        console.warn(
          `[ingestion] Failed to enrich candidate ${candidate.url}:`,
          error instanceof Error ? error.message : error
        );
        enriched.push({ ...candidate, summary: candidate.summary, content: undefined });
      }
    }

    return { ok: true, items: enriched, statusCode: response.status, warnings: [] };
  } catch (error) {
    return {
      ok: false,
      items: [],
      statusCode: undefined,
      errorMessage: error instanceof Error ? error.message : 'HTML scraping error'
    };
  }
}

export async function fetchSourceFeed(
  source: Pick<NewsSource, 'id' | 'name' | 'homepageUrl' | 'rssUrl' | 'scrapeUrl' | 'language'>,
  fetchImpl: FetchImpl = fetch
): Promise<FetchSourceResult> {
  if (source.rssUrl) {
    const rssResult = await parseRssFeed(source.rssUrl, fetchImpl);
    if (rssResult.ok || !source.scrapeUrl) {
      return rssResult;
    }
    const fallback = await fetchAndParseHtmlListing(source.scrapeUrl, fetchImpl);
    if (!fallback.ok && !rssResult.ok) {
      return {
        ok: false,
        items: [],
        statusCode: fallback.statusCode ?? rssResult.statusCode,
        errorMessage: fallback.ok
          ? 'Unknown ingestion failure'
          : fallback.errorMessage ?? rssResult.errorMessage
      };
    }
    if (fallback.ok) {
      return {
        ok: true,
        items: fallback.items,
        statusCode: fallback.statusCode ?? rssResult.statusCode,
        warnings: ['RSS fetch failed; fell back to HTML listing']
      };
    }
    return rssResult;
  }

  if (source.scrapeUrl) {
    return fetchAndParseHtmlListing(source.scrapeUrl, fetchImpl);
  }

  return {
    ok: false,
    items: [],
    errorMessage: 'Source has no RSS or HTML configuration'
  };
}

export type NormalizedArticle = {
  title: string;
  description: string;
  contentHtml: string;
  publishedAt: Date;
  canonicalUrl: string;
  coverImageUrl?: string;
  sourceImageUrl?: string;
  language: Lang;
};

export async function normalizeRawItemToArticle({
  raw,
  source
}: NormalizedArticleInput): Promise<NormalizedArticle> {
  const publishedAt = raw.publishedAt ?? new Date();
  const baseLanguage = (source.language?.toUpperCase() as Lang | undefined) ?? Lang.EN;
  const language = raw.languageGuess ?? detectLanguage(`${raw.title} ${raw.summary ?? ''}`, baseLanguage);

  const description = raw.summary ?? raw.content ?? '';
  const contentSource = raw.content ?? raw.summary ?? '';
  const sanitizedHtml = sanitizeHtml(contentSource, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption']),
    allowedAttributes: {
      img: ['src', 'alt', 'width', 'height'],
      a: ['href', 'rel', 'target']
    }
  });

  return {
    title: raw.title || 'Untitled article',
    description,
    contentHtml: sanitizedHtml,
    publishedAt,
    canonicalUrl: raw.url,
    coverImageUrl: raw.image,
    sourceImageUrl: raw.image,
    language
  };
}
