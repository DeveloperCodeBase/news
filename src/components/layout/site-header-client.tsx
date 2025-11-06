'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import type { AppLocale } from '@/lib/i18n/config';
import LocaleSwitcher from '../locale-switcher';

type HeaderLink = { href: string; label: string };

type SiteHeaderClientProps = {
  locale: AppLocale;
  links: HeaderLink[];
  loginHref: string;
  loginLabel: string;
  brandLabel: string;
};

export default function SiteHeaderClient({
  locale,
  links,
  loginHref,
  loginLabel,
  brandLabel
}: SiteHeaderClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const direction = locale === 'fa' ? 'rtl' : 'ltr';
  const isRTL = direction === 'rtl';

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header
      dir={direction}
      className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 shadow backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href={`/${locale}`}
          className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg"
        >
          {brandLabel}
        </Link>
        <div className="flex items-center gap-3 md:hidden">
          <LocaleSwitcher locale={locale} />
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-full border border-slate-700/80 p-2 text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-sky-300"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={loginHref}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium hover:border-sky-300 hover:text-sky-300"
          >
            {loginLabel}
          </Link>
          <LocaleSwitcher locale={locale} />
        </nav>
      </div>
      <div
        className={clsx(
          'md:hidden',
          isMenuOpen ? 'block' : 'hidden'
        )}
      >
        <nav
          className={clsx(
            'border-t border-slate-800/70 bg-slate-950/95 px-4 py-3 text-sm text-slate-100 shadow-inner sm:px-6',
            isRTL ? 'text-right' : 'text-left'
          )}
        >
          <ul className="space-y-3">
            {links.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg border border-transparent px-3 py-2 transition hover:border-sky-500/60 hover:text-sky-200"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={loginHref}
                className="block rounded-lg border border-sky-600/60 bg-sky-500/20 px-3 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30"
              >
                {loginLabel}
              </Link>
            </li>
            <li>
              <div className={clsx('flex justify-start', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                <LocaleSwitcher locale={locale} />
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
