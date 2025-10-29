import type { AppLocale } from '@/lib/i18n/config';

type LocalizableRecord = Record<string, unknown> & {
  titleFa?: string;
  titleEn?: string | null;
  excerptFa?: string | null;
  excerptEn?: string | null;
  summaryFa?: string | null;
  summaryEn?: string | null;
  nameFa?: string;
  nameEn?: string | null;
};

export function getLocalizedValue(
  record: LocalizableRecord,
  locale: AppLocale,
  field: 'title' | 'excerpt' | 'summary' | 'name'
): string {
  const faKey = `${field}Fa` as keyof LocalizableRecord;
  const enKey = `${field}En` as keyof LocalizableRecord;

  if (locale === 'fa') {
    return (record[faKey] as string) ?? (record[enKey] as string) ?? '';
  }

  return (record[enKey] as string) ?? (record[faKey] as string) ?? '';
}
