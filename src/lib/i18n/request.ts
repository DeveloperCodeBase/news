import type { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, isLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale();
  const fallbackAwareLocale = resolved && isLocale(resolved) ? resolved : DEFAULT_LOCALE;

  const messages = (await import(`@/locales/${fallbackAwareLocale}.json`))
    .default as AbstractIntlMessages;

  return {
    locale: fallbackAwareLocale,
    messages
  };
});
