import type { ReactNode } from 'react';
import SiteHeader from './site-header';
import SiteFooter from './site-footer';
import type { AppLocale } from '@/lib/i18n/config';

export default function SiteShell({ children, locale }: { children: ReactNode; locale: AppLocale }) {
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <div data-locale={locale} data-dir={direction} className="flex min-h-screen flex-col bg-slate-950">
      <SiteHeader locale={locale} />
      <main dir={direction} className="flex-1 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        {children}
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
