import type { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, isLocale } from './config';

export default getRequestConfig(async ({ locale }) => {
  let resolvedLocale = locale;

  if (!resolvedLocale || !isLocale(resolvedLocale)) {
    resolvedLocale = DEFAULT_LOCALE;
  }

  const messages = (await import(`@/locales/${resolvedLocale}.json`))
    .default as AbstractIntlMessages;

  return {
    locale: resolvedLocale,
    messages
  };
});
