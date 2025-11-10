import type { AppLocale } from '../i18n/config';
import type { ArticleFaTranslationMeta, TranslationFieldState } from '../translation/meta';
import { parseFaTranslationMeta } from '../translation/meta';

type LocalizableRecord = Record<string, unknown> & {
  titleFa?: string;
  titleEn?: string | null;
  excerptFa?: string | null;
  excerptEn?: string | null;
  summaryFa?: string | null;
  summaryEn?: string | null;
  contentFa?: string | null;
  contentEn?: string | null;
  nameFa?: string;
  nameEn?: string | null;
};

export function getLocalizedValue(
  record: LocalizableRecord,
  locale: AppLocale,
  field: 'title' | 'excerpt' | 'summary' | 'name' | 'content'
): string {
  const faKey = `${field}Fa` as keyof LocalizableRecord;
  const enKey = `${field}En` as keyof LocalizableRecord;

  if (locale === 'fa') {
    return (record[faKey] as string) ?? (record[enKey] as string) ?? '';
  }

  return (record[enKey] as string) ?? (record[faKey] as string) ?? '';
}

export type LocalizedFieldResult = {
  value: string;
  isFallback: boolean;
  status: TranslationFieldState['status'];
  provider?: string | null;
  error?: string | null;
  attemptedAt?: string | null;
};

export function getLocalizedFieldWithMeta(
  record: LocalizableRecord,
  locale: AppLocale,
  field: 'title' | 'excerpt' | 'summary' | 'content',
  meta: unknown
): LocalizedFieldResult {
  const faKey = `${field}Fa` as keyof LocalizableRecord;
  const enKey = `${field}En` as keyof LocalizableRecord;
  const faValue = (record[faKey] as string | null | undefined) ?? null;
  const enValue = (record[enKey] as string | null | undefined) ?? null;

  if (locale !== 'fa') {
    return {
      value: enValue ?? faValue ?? '',
      isFallback: false,
      status: 'translated',
      provider: null,
      error: null,
      attemptedAt: null
    };
  }

  const parsed = parseFaTranslationMeta(meta);
  const state = (parsed as Record<string, TranslationFieldState | undefined>)[field] ?? {
    status: faValue ? 'manual' : 'fallback',
    provider: null,
    error: null,
    attemptedAt: null
  };
  const fallbackValue = enValue ?? faValue ?? '';
  const value = faValue ?? fallbackValue;
  const isFallback = state.status === 'fallback' || !faValue;

  return {
    value,
    isFallback,
    status: state.status,
    provider: state.provider ?? null,
    error: state.error ?? null,
    attemptedAt: state.attemptedAt ?? null
  };
}
