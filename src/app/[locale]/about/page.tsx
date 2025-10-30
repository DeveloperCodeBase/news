import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/lib/i18n/config';

export default async function AboutPage({ params }: { params: { locale: AppLocale } }) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'about' });
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" dir={direction}>
      <h1 className="text-4xl font-bold text-slate-50">{t('title')}</h1>
      <div className="mt-6 space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-base leading-relaxed text-slate-200 shadow-xl shadow-slate-950/40">
        <p>{t('mission')}</p>
        <p>{t('vision')}</p>
        <p>{t('workflow')}</p>
      </div>
    </div>
  );
}
