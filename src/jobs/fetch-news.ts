import Parser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import { createHash } from 'node:crypto';

const parser = new Parser({ timeout: 20000 });

export type FetchNewsOptions = {
  sources: Array<{ feedUrl: string; isTrusted: boolean }>;
};

export type NormalizedArticle = {
  title: string;
  link: string;
  contentSnippet?: string;
  publishedAt?: Date;
  hash: string;
  isTrusted: boolean;
};

export async function fetchNews({ sources }: FetchNewsOptions): Promise<NormalizedArticle[]> {
  const items: NormalizedArticle[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.feedUrl);
      for (const item of feed.items ?? []) {
        const title = (item.title ?? '').trim();
        const link = (item.link ?? '').trim();
        const contentSnippet = sanitizeHtml(item.contentSnippet ?? '', { allowedTags: [], allowedAttributes: {} });
        const publishedAt = item.isoDate ? new Date(item.isoDate) : undefined;
        if (!title || !link) continue;
        const hash = createHash('sha256').update(`${link}:${title}`).digest('hex');
        items.push({ title, link, contentSnippet, publishedAt, hash, isTrusted: source.isTrusted });
      }
    } catch (error) {
      console.error(`Failed to parse feed ${source.feedUrl}`, error);
    }
  }

  return items;
}
