import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = requestLocale;

  if (!locale || !SUPPORTED_LOCALES.includes(locale as AppLocale)) {
    locale = DEFAULT_LOCALE;
  }

  const messages = await import(`@/locales/${locale}.json`).then((module) => module.default);

  return {
    locale,
    messages
  };
});
