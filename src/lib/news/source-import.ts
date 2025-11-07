import fs from 'node:fs/promises';
import path from 'node:path';
import type { SeedNewsSource } from './sources';

const LANGUAGE_BY_TLD: Record<string, string> = {
  ae: 'ar',
  ar: 'es',
  at: 'de',
  au: 'en',
  be: 'nl',
  br: 'pt',
  ca: 'en',
  ch: 'de',
  cn: 'zh',
  cz: 'cs',
  de: 'de',
  dk: 'da',
  es: 'es',
  eu: 'en',
  fi: 'fi',
  fr: 'fr',
  gr: 'el',
  hk: 'zh',
  il: 'he',
  in: 'en',
  ir: 'fa',
  it: 'it',
  jp: 'ja',
  kr: 'ko',
  mx: 'es',
  nl: 'nl',
  no: 'no',
  nz: 'en',
  pl: 'pl',
  pt: 'pt',
  ru: 'ru',
  se: 'sv',
  sg: 'en',
  tr: 'tr',
  tw: 'zh',
  uk: 'en',
  us: 'en',
  za: 'en'
};

function ensureAiTag(tags: string[]): string[] {
  const normalized = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  if (!normalized.includes('ai')) {
    normalized.unshift('ai');
  }
  return normalized;
}

function inferLanguageFromUrl(url: string, fallback = 'en'): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const tld = hostname.split('.').pop();
    if (tld && LANGUAGE_BY_TLD[tld]) {
      return LANGUAGE_BY_TLD[tld];
    }
  } catch (_error) {
    // ignore parsing error and fallback
  }
  return fallback;
}

function sanitizeUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch (_error) {
    return null;
  }
}

export type ParsedSourceLine = {
  name: string;
  homepageUrl: string;
  rssUrl?: string | null;
  scrapeUrl?: string | null;
  language: string;
  region?: string | null;
  topicTags: string[];
  notes?: string | null;
};

export function parseSourceLine(line: string): ParsedSourceLine | null {
  if (!line.startsWith('-')) return null;
  const body = line.slice(1).trim();
  if (!body) return null;

  const parts = body.split('|').map((part) => part.trim());
  if (parts.length < 2) return null;

  const [namePart, homepagePart, ...rest] = parts;
  const homepageUrl = sanitizeUrl(homepagePart);
  if (!homepageUrl) return null;

  const fieldMap = new Map<string, string>();
  for (const segment of rest) {
    const [rawKey, ...rawValueParts] = segment.split('=');
    if (!rawKey || rawValueParts.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rawValueParts.join('=').trim();
    if (!value) continue;
    fieldMap.set(key, value);
  }

  const rssUrl = sanitizeUrl(fieldMap.get('rss'));
  const scrapeUrl = sanitizeUrl(fieldMap.get('scrape'));
  const language = (fieldMap.get('lang') ?? inferLanguageFromUrl(homepageUrl)).toLowerCase();
  const regionValue = fieldMap.get('region');
  const region = regionValue ? regionValue.toUpperCase() : null;
  const tags = fieldMap.get('tags')?.split(',') ?? ['ai'];
  const notes = fieldMap.get('notes') ?? null;

  const topicTags = ensureAiTag(tags);

  return {
    name: namePart.trim(),
    homepageUrl,
    rssUrl,
    scrapeUrl,
    language: language.trim() || inferLanguageFromUrl(homepageUrl),
    region: region?.trim() || null,
    topicTags,
    notes
  };
}

export async function loadAiSourcesFromFile(filePath: string): Promise<SeedNewsSource[]> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const content = await fs.readFile(absolutePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const seenHomepages = new Set<string>();
  const seenFeeds = new Set<string>();
  const seeds: SeedNewsSource[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('-')) continue;

    const parsed = parseSourceLine(trimmed);
    if (!parsed) continue;

    const homepageKey = parsed.homepageUrl.toLowerCase();
    if (seenHomepages.has(homepageKey)) continue;

    const feedKey = parsed.rssUrl?.toLowerCase();
    let rssUrl = parsed.rssUrl ?? null;
    if (feedKey) {
      if (seenFeeds.has(feedKey)) {
        rssUrl = null;
      } else {
        seenFeeds.add(feedKey);
      }
    }

    const scrapeUrl = parsed.scrapeUrl ?? (!rssUrl ? parsed.homepageUrl : null);

    seeds.push({
      name: parsed.name,
      homepageUrl: parsed.homepageUrl,
      rssUrl: rssUrl ?? undefined,
      scrapeUrl: scrapeUrl ?? undefined,
      language: parsed.language,
      region: parsed.region ?? undefined,
      topicTags: parsed.topicTags,
      notes: parsed.notes ?? undefined,
      enabled: true,
      isTrusted: true,
      priority: 10
    });

    seenHomepages.add(homepageKey);
  }

  return seeds;
}

export async function previewAiSourceFile(filePath: string) {
  const seeds = await loadAiSourcesFromFile(filePath);
  return {
    count: seeds.length,
    languages: Array.from(
      seeds.reduce((acc, source) => acc.set(source.language, (acc.get(source.language) ?? 0) + 1), new Map<string, number>())
    ).map(([language, total]) => ({ language, total }))
  };
}
