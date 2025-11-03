import type { AppLocale } from '@/lib/i18n/config';

const LOCALE_MAP: Record<AppLocale, string> = {
  fa: 'fa-IR',
  en: 'en-US'
};

export function formatDisplayDate(date: Date, locale: AppLocale): string {
  const formatter = new Intl.DateTimeFormat(LOCALE_MAP[locale], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  return formatter.format(date);
}
