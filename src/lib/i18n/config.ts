export const DEFAULT_LOCALE = 'fa';
export const SUPPORTED_LOCALES = ['fa', 'en'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isLocale(locale: string): locale is AppLocale {
  return SUPPORTED_LOCALES.includes(locale as AppLocale);
}
