import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/lib/i18n/config';
import LocaleSwitcher from '../locale-switcher';

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
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href={basePath} className="text-lg font-semibold tracking-tight text-slate-100">
          Hoosh Gate Magazine
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-200">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-sky-300">
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium hover:border-sky-300 hover:text-sky-300">
            {t('login')}
          </Link>
          <LocaleSwitcher locale={locale} />
        </nav>
      </div>
    </header>
  );
}
