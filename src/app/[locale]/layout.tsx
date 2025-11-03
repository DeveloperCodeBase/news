import type { ReactNode } from 'react';
import { getLocale, getMessages, getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import Providers from '@/components/providers';
import SiteShell from '@/components/layout/site-shell';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from '@/lib/i18n/config';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: { locale: AppLocale } }): Promise<Metadata> {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hooshgate.ir';

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((code) => [code, `${baseUrl}/${code}`])
      )
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { locale: AppLocale };
}) {
  const locale = params.locale ?? DEFAULT_LOCALE;
  unstable_setRequestLocale(locale);
  const [messages] = await Promise.all([getMessages()]);

  const detectedLocale = await getLocale();
  const safeLocale = SUPPORTED_LOCALES.includes(detectedLocale as AppLocale)
    ? (detectedLocale as AppLocale)
    : DEFAULT_LOCALE;

  return (
    <Providers locale={safeLocale} messages={messages}>
      <SiteShell locale={safeLocale}>{children}</SiteShell>
    </Providers>
  );
}
