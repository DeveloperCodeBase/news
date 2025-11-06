import OpenAI from 'openai';
import sanitizeHtml from 'sanitize-html';
import { Lang } from '@prisma/client';
import { getEnv } from '@/lib/env';

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  const { OPENAI_API_KEY } = getEnv();
  if (!OPENAI_API_KEY) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return cachedClient;
}

const allowedTags = [
  'p',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h2',
  'h3',
  'figure',
  'figcaption',
  'a'
];

const allowedAttributes: sanitizeHtml.IAttributes = {
  a: ['href', 'rel', 'target']
};

export type LongformPayload = {
  title: string;
  summary?: string;
  rawHtml?: string;
  language: Lang;
  sourceName: string;
  publishedAt?: Date;
};

export type LongformResult = {
  html: string;
};

function buildPrompt({ title, summary, rawHtml, language, sourceName, publishedAt }: LongformPayload) {
  const localeLabel = language === Lang.FA ? 'Persian (Farsi)' : 'English';
  const dateLabel = publishedAt ? publishedAt.toISOString().split('T')[0] : 'recent date';
  const plainContext = sanitizeHtml(rawHtml ?? '', { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
  const overview = summary?.trim() || '';

  return `Title: ${title}\nLanguage: ${localeLabel}\nSource: ${sourceName}\nPublication Date: ${dateLabel}\nSummary: ${overview}\nContext: ${plainContext}`;
}

export async function generateLongformArticle(payload: LongformPayload): Promise<LongformResult | null> {
  const client = getClient();
  if (!client) {
    return null;
  }

  const prompt = buildPrompt(payload);

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 1800,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior journalist at a bilingual AI research magazine. Produce polished long-form articles with clear sections, data-driven insights, and professional tone.'
        },
        {
          role: 'user',
          content: `Using the context below, write a feature article in ${payload.language === Lang.FA ? 'Persian (Farsi)' : 'English'}.
- Audience: AI researchers, executives, and policymakers.
- Structure: an engaging introduction, 4-6 thematic sections with <h2> headings, supporting paragraphs, bullet lists when helpful, one expert-style quotation, and a concluding outlook.
- Style: analytical, factual, and magazine-quality.
- Output: HTML snippet only (no <html> or <body>). Use <p>, <h2>, <h3>, <ul>, <ol>, <li>, <blockquote>, <code>, <pre>, <strong>, <em>, <figure>, and <figcaption>. Provide descriptive captions instead of <img> tags.

Context:
${prompt}`
        }
      ]
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      return null;
    }

    const cleaned = sanitizeHtml(raw, {
      allowedTags,
      allowedAttributes,
      transformTags: {
        h1: 'h2'
      }
    }).trim();

    if (!cleaned) {
      return null;
    }

    return { html: cleaned };
  } catch (error) {
    console.warn('Failed to generate longform article', error);
    return null;
  }
}
