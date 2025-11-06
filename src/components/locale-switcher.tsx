'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { SUPPORTED_LOCALES, type AppLocale } from '@/lib/i18n/config';
import clsx from 'clsx';

type LocaleSwitcherProps = {
  locale: AppLocale;
};

export default function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const activeLocale = useLocale() ?? locale;
  const [isPending, startTransition] = useTransition();

  const toggleLocale = (nextLocale: AppLocale) => {
    if (nextLocale === activeLocale) return;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      startTransition(() => router.push(`/${nextLocale}`));
      return;
    }
    segments[0] = nextLocale;
    startTransition(() => router.push(`/${segments.join('/')}`));
  };

  return (
    <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-slate-700/60 px-2 py-1 text-xs">
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => toggleLocale(code)}
          className={clsx(
            'rounded-full px-2 py-1 transition',
            activeLocale === code ? 'bg-sky-500/90 text-slate-950' : 'text-slate-300 hover:text-white'
          )}
          disabled={isPending}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
