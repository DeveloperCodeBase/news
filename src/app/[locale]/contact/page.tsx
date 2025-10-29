import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/lib/i18n/config';

export default async function ContactPage({ params }: { params: { locale: AppLocale } }) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'contact' });
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" dir={direction}>
      <h1 className="text-4xl font-bold text-slate-50">{t('title')}</h1>
      <p className="mt-4 text-slate-300">{t('description')}</p>
      <div className="mt-8 space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-base text-slate-200 shadow-xl shadow-slate-950/40">
        <p>{t('company')}</p>
        <p>{t('ceo')}</p>
        <p>{t('phone')}</p>
        <p>
          {t('email')}{' '}
          <Link className="text-sky-300 hover:text-sky-200" href="mailto:devcodebase.dec@gmail.com">
            devcodebase.dec@gmail.com
          </Link>
        </p>
        <p>{t('address')}</p>
      </div>
    </div>
  );
}
