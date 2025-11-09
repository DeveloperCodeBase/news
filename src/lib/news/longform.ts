import sanitizeHtml from 'sanitize-html';
import { Lang } from '@prisma/client';
import { BudgetExceededError, callOpenAI } from '../ai/openai';

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

const sanitizeOptions: NonNullable<Parameters<typeof sanitizeHtml>[1]> = {
  allowedTags,
  allowedAttributes: {
    a: ['href', 'rel', 'target']
  },
  transformTags: {
    h1: 'h2'
  }
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
    .slice(0, 4000);
  const overview = summary?.trim() || '';

  return `Title: ${title}\nLanguage: ${localeLabel}\nSource: ${sourceName}\nPublication Date: ${dateLabel}\nSummary: ${overview}\nContext: ${plainContext}`;
}

export async function generateLongformArticle(payload: LongformPayload): Promise<LongformResult | null> {
  const prompt = buildPrompt(payload);

  try {
    const response = await callOpenAI(
      (client) =>
        client.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.4,
          max_tokens: 700,
          messages: [
            {
              role: 'system',
              content:
                'You are a senior journalist at a bilingual AI research magazine. Produce polished long-form articles with clear sections, data-driven insights, and professional tone.'
            },
            {
              role: 'user',
              content: `Using the context below, write a concise feature article in ${
                payload.language === Lang.FA ? 'Persian (Farsi)' : 'English'
              }.
- Audience: AI researchers, executives, and policymakers.
- Length: 3-4 short sections with <h2> headings and succinct paragraphs (no more than 750 words total).
- Style: analytical, factual, and magazine-quality.
- Output: HTML snippet only (no <html> or <body>). Use <p>, <h2>, <h3>, <ul>, <ol>, <li>, <blockquote>, <code>, <pre>, <strong>, <em>, <figure>, and <figcaption>. Provide descriptive captions instead of <img> tags.

Context:
${prompt}`
            }
          ]
        }),
      { maxExpectedTokens: 1000 }
    );

    if (!response) {
      return null;
    }

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      return null;
    }

    const cleaned = sanitizeHtml(raw, sanitizeOptions).trim();

    if (!cleaned) {
      return null;
    }

    return { html: cleaned };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      throw error;
    }
    console.warn('Failed to generate longform article', error);
    return null;
  }
}
