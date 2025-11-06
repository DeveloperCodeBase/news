'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import type { AppLocale } from '@/lib/i18n/config';
import SignOutButton from './sign-out-button';

type NavItem = { href: string; label: string };

type AdminHeaderProps = {
  email: string;
  roleLabel: string;
  locale: AppLocale;
  navItems: NavItem[];
};

export default function AdminHeader({ email, roleLabel, locale, navItems }: AdminHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const direction = locale === 'fa' ? 'rtl' : 'ltr';
  const isRTL = direction === 'rtl';

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header dir={direction} className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="space-y-1 text-sm sm:text-base">
          <p className="text-base font-semibold text-slate-100 sm:text-lg">پنل مدیریت مجله هوش گیت</p>
          <p className="text-xs text-slate-400 sm:text-sm">
            {email} · نقش:
            <span className="font-medium text-emerald-400"> {roleLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 md:hidden">
          <SignOutButton className="px-3 py-2 text-xs" />
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/70 text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close admin navigation' : 'Open admin navigation'}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <nav className={clsx('flex items-center gap-4 text-sm text-slate-300', isRTL && 'flex-row-reverse')}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'rounded-full px-3 py-1 transition hover:bg-slate-900/80 hover:text-sky-200',
                  pathname?.startsWith(item.href) ? 'bg-sky-500/20 text-sky-100' : undefined
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <SignOutButton />
        </div>
      </div>
      <div className={clsx('md:hidden', isMenuOpen ? 'block' : 'hidden')}>
        <nav
          className={clsx(
            'border-t border-slate-800/70 bg-slate-950/95 px-4 py-4 text-sm text-slate-100 shadow-inner sm:px-6',
            isRTL ? 'text-right' : 'text-left'
          )}
        >
          <ul className="space-y-3">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'block rounded-xl border border-transparent px-3 py-2 transition hover:border-sky-500/60 hover:text-sky-200',
                    pathname?.startsWith(item.href) ? 'border-sky-500/40 bg-slate-900/60 text-sky-100' : undefined
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className={clsx('flex justify-start', isRTL ? 'flex-row-reverse' : 'flex-row')}>
              <SignOutButton className="w-full text-center" />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
