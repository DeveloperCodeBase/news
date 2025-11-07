import { describe, expect, it } from 'vitest';
import { loadAiSourcesFromFile, parseSourceLine } from '@/lib/news/source-import';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('source-import', () => {
  it('parses a single markdown line', () => {
    const parsed = parseSourceLine('- Sample AI Source | https://example.ai | rss=https://example.ai/feed | lang=en | region=US | tags=ai,ml,robotics');
    expect(parsed).toBeTruthy();
    expect(parsed?.name).toBe('Sample AI Source');
    expect(parsed?.homepageUrl).toBe('https://example.ai/');
    expect(parsed?.rssUrl).toBe('https://example.ai/feed');
    expect(parsed?.language).toBe('en');
    expect(parsed?.region).toBe('US');
    expect(parsed?.topicTags).toContain('ai');
  });

  it('loads and deduplicates sources from the markdown catalogue', async () => {
    const filePath = path.join(process.cwd(), 'data', 'allainews_sources.md');
    const stats = await fs.stat(filePath);
    expect(stats.size).toBeGreaterThan(0);

    const seeds = await loadAiSourcesFromFile(filePath);
    // catalogue contains > 1000 sources; ensure parser keeps them enabled and unique
    expect(seeds.length).toBeGreaterThan(1000);
    const homepageSet = new Set(seeds.map((item) => item.homepageUrl.toLowerCase()));
    expect(homepageSet.size).toBe(seeds.length);
    for (const seed of seeds) {
      expect(seed.topicTags).toContain('ai');
      expect(seed.enabled).toBe(true);
      expect(seed.isTrusted).toBe(true);
    }
  });
});
