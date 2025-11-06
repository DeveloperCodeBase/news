import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/lib/i18n/config';
import SiteHeaderClient from './site-header-client';

export default async function SiteHeader({ locale }: { locale: AppLocale }) {
  const t = await getTranslations('navigation');
  const basePath = `/${locale}`;
  const links = [
    { href: basePath, label: t('home') },
    { href: `${basePath}/news`, label: t('latest') },
    { href: `${basePath}/about`, label: t('about') },
    { href: `${basePath}/contact`, label: t('contact') }
  ];

  return (
    <SiteHeaderClient
      locale={locale}
      links={links}
      loginHref="/login"
      loginLabel={t('login')}
      brandLabel="Hoosh Gate Magazine"
    />
  );
}
