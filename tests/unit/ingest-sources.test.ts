import { describe, expect, it, vi } from 'vitest';
import { Lang } from '@prisma/client';

vi.mock('metascraper', () => ({
  default: () =>
    async () => ({
      title: 'Fallback title',
      url: 'https://example.com/article',
      description: 'Fallback description',
      image: 'https://example.com/image.jpg',
      author: 'Meta Author',
      date: '2024-01-01T00:00:00Z',
      html: '<p>Fallback content</p>'
    })
}));

vi.mock('metascraper-author', () => ({ default: () => ({}) }));
vi.mock('metascraper-date', () => ({ default: () => ({}) }));
vi.mock('metascraper-description', () => ({ default: () => ({}) }));
vi.mock('metascraper-image', () => ({ default: () => ({}) }));
vi.mock('metascraper-title', () => ({ default: () => ({}) }));
vi.mock('metascraper-url', () => ({ default: () => ({}) }));

import { fetchSourceFeed, normalizeRawItemToArticle } from '@/lib/ingest/sources';

describe('fetchSourceFeed', () => {
  it('returns failure when RSS responds with 403', async () => {
    const result = await fetchSourceFeed(
      {
        id: 'openai',
        name: 'OpenAI Blog',
        homepageUrl: 'https://openai.com/blog',
        rssUrl: 'https://openai.com/blog/rss/',
        scrapeUrl: null,
        language: 'en'
      },
      async () => new Response('Forbidden', { status: 403 })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(403);
      expect(result.errorMessage).toContain('Failed to fetch RSS');
    }
  });

  it('parses items from a successful RSS feed', async () => {
    const rss = `<?xml version="1.0"?><rss version="2.0"><channel><item><title>Test AI Story</title><link>https://example.com/a1</link><description>Summary</description></item></channel></rss>`;

    const result = await fetchSourceFeed(
      {
        id: 'rss-source',
        name: 'RSS Source',
        homepageUrl: 'https://example.com',
        rssUrl: 'https://example.com/feed.xml',
        scrapeUrl: null,
        language: 'en'
      },
      async () => new Response(rss, { status: 200 })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0].url).toBe('https://example.com/a1');
      expect(result.items[0].title).toBe('Test AI Story');
    }
  });

  it('falls back to HTML scraping when RSS fails', async () => {
    const htmlListing = '<html><body><a href="https://example.com/b1">Example Story</a></body></html>';
    const articleHtml = '<html><head><title>Example Story</title></head><body><p>Article content</p></body></html>';

    const responses = [
      new Response('Server error', { status: 500 }),
      new Response(htmlListing, { status: 200 }),
      new Response(articleHtml, { status: 200 })
    ];

    const fetchStub = vi.fn(async () => {
      const next = responses.shift();
      if (!next) {
        throw new Error('Unexpected fetch call');
      }
      return next;
    });

    const result = await fetchSourceFeed(
      {
        id: 'fallback',
        name: 'Fallback Source',
        homepageUrl: 'https://example.com',
        rssUrl: 'https://example.com/failing-feed.xml',
        scrapeUrl: 'https://example.com/news',
        language: 'en'
      },
      fetchStub as unknown as typeof fetch
    );

    expect(fetchStub).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.warnings).toContain('RSS fetch failed; fell back to HTML listing');
    }
  });
});

describe('normalizeRawItemToArticle', () => {
  it('normalizes raw items and detects language', async () => {
    const normalized = await normalizeRawItemToArticle({
      raw: {
        title: 'خبر آزمایشی هوش مصنوعی',
        url: 'https://example.com/persian',
        summary: 'این یک خلاصه کوتاه است.'
      },
      source: {
        id: 'fa-source',
        name: 'Persian Source',
        homepageUrl: 'https://example.com',
        rssUrl: null,
        language: 'fa',
        isTrusted: false
      }
    });

    expect(normalized.title).toContain('خبر آزمایشی');
    expect(normalized.language).toBe(Lang.FA);
    expect(normalized.canonicalUrl).toBe('https://example.com/persian');
  });
});
