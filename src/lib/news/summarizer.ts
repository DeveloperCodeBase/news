import sanitizeHtml from 'sanitize-html';

const PERSIAN_STOP_WORDS = new Set([
  'و',
  'در',
  'به',
  'از',
  'که',
  'این',
  'را',
  'با',
  'است',
  'برای',
  'می',
  'آن',
  'یک',
  'تا',
  'بر',
  'هم',
  'اگر',
  'اما'
]);

const ENGLISH_STOP_WORDS = new Set([
  'the',
  'is',
  'and',
  'a',
  'an',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'as',
  'by',
  'at',
  'be',
  'are',
  'from',
  'that',
  'it',
  'this',
  'was',
  'were',
  'or'
]);

function normalizeText(text: string) {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[.,?!؛،!\-—\(\)\[\]\{\}\"\'«»]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function splitSentences(text: string) {
  const normalized = text.replace(/([.!؟؟]\s+)/g, '$1|');
  return normalized
    .split('|')
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 3);
}

function buildFrequencyMap(words: string[], isPersian: boolean) {
  const frequency = new Map<string, number>();
  const stopWords = isPersian ? PERSIAN_STOP_WORDS : ENGLISH_STOP_WORDS;

  for (const word of words) {
    if (!word) continue;
    if (stopWords.has(word)) continue;
    const count = frequency.get(word) ?? 0;
    frequency.set(word, count + 1);
  }

  return frequency;
}

function scoreSentence(sentence: string, frequency: Map<string, number>) {
  if (!sentence) return 0;
  const tokens = tokenize(sentence);
  if (!tokens.length) return 0;
  const score = tokens.reduce((total, token) => total + (frequency.get(token) ?? 0), 0);
  return score / tokens.length;
}

export function summarizeText({
  text,
  locale,
  maxSentences = 2,
  maxLength = 320
}: {
  text: string | null | undefined;
  locale: 'fa' | 'en';
  maxSentences?: number;
  maxLength?: number;
}) {
  if (!text) return '';

  const normalized = normalizeText(text);
  if (!normalized) return '';

  const isPersian = locale === 'fa';
  const sentences = splitSentences(normalized);
  if (sentences.length === 0) {
    return normalized.slice(0, maxLength);
  }

  const frequency = buildFrequencyMap(tokenize(normalized), isPersian);
  const scored = sentences
    .map((sentence) => ({
      sentence,
      score: scoreSentence(sentence, frequency)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))
    .map((item) => item.sentence.trim());

  const joined = scored.join(' ');
  if (joined.length <= maxLength) {
    return joined;
  }

  return joined.slice(0, maxLength).trimEnd() + '…';
}

export function buildBilingualSummaries({
  persian,
  english
}: {
  persian?: string | null;
  english?: string | null;
}) {
  const summaryFa = summarizeText({ text: persian ?? english ?? '', locale: 'fa' });
  const summaryEn = summarizeText({ text: english ?? persian ?? '', locale: 'en' });
  return { summaryFa, summaryEn };
}
