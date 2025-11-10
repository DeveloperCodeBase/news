import { z } from 'zod';

export const TRANSLATION_STATUS_VALUES = ['source', 'translated', 'fallback', 'manual'] as const;

export type TranslationStatus = (typeof TRANSLATION_STATUS_VALUES)[number];

export type TranslationFieldState = {
  status: TranslationStatus;
  provider?: string | null;
  error?: string | null;
  attemptedAt?: string | null;
};

export type ArticleFaTranslationMeta = {
  title: TranslationFieldState;
  excerpt: TranslationFieldState;
  content: TranslationFieldState;
};

const fallbackState: TranslationFieldState = {
  status: 'fallback',
  provider: null,
  error: null,
  attemptedAt: null
};

const translationFieldStateSchema = z
  .object({
    status: z.enum(TRANSLATION_STATUS_VALUES).default('fallback'),
    provider: z.string().min(1).optional().nullable(),
    error: z.string().min(1).optional().nullable(),
    attemptedAt: z
      .string()
      .datetime({ offset: true })
      .optional()
      .nullable()
  })
  .catch(() => fallbackState);

const articleFaTranslationMetaSchema = z
  .object({
    title: translationFieldStateSchema.optional(),
    excerpt: translationFieldStateSchema.optional(),
    content: translationFieldStateSchema.optional()
  })
  .catch(() => ({}));

export function parseFaTranslationMeta(value: unknown): ArticleFaTranslationMeta {
  const parsed = articleFaTranslationMetaSchema.parse(value ?? {});
  return {
    title: parsed.title ?? fallbackState,
    excerpt: parsed.excerpt ?? fallbackState,
    content: parsed.content ?? fallbackState
  } satisfies ArticleFaTranslationMeta;
}

export function createFieldState(
  status: TranslationStatus,
  provider?: string | null,
  error?: string | null,
  attemptedAt?: Date | string | null
): TranslationFieldState {
  const timestamp = attemptedAt instanceof Date ? attemptedAt.toISOString() : attemptedAt ?? null;
  return {
    status,
    provider: provider ?? null,
    error: error ?? null,
    attemptedAt: timestamp
  };
}

export function combineFaTranslationMeta(
  base: Partial<ArticleFaTranslationMeta> | null | undefined,
  updates: Partial<ArticleFaTranslationMeta>
): ArticleFaTranslationMeta {
  const parsed = parseFaTranslationMeta(base ?? {});
  return {
    title: updates.title ?? parsed.title,
    excerpt: updates.excerpt ?? parsed.excerpt,
    content: updates.content ?? parsed.content
  } satisfies ArticleFaTranslationMeta;
}

export function isFallbackState(state: TranslationFieldState | null | undefined): boolean {
  if (!state) return true;
  return state.status === 'fallback';
}

export function isManualState(state: TranslationFieldState | null | undefined): boolean {
  if (!state) return false;
  return state.status === 'manual';
}

export function isTranslatedState(state: TranslationFieldState | null | undefined): boolean {
  if (!state) return false;
  return state.status === 'translated' || state.status === 'manual' || state.status === 'source';
}

export function serializeFaTranslationMeta(meta: ArticleFaTranslationMeta): ArticleFaTranslationMeta {
  return {
    title: { ...meta.title },
    excerpt: { ...meta.excerpt },
    content: { ...meta.content }
  } satisfies ArticleFaTranslationMeta;
}

