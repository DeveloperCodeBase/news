import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';

export default async function NotFound() {
  const locale = (await getLocale()) ?? 'fa';
  const t = await getTranslations({ locale, namespace: 'notFound' });
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center" dir={direction}>
      <h1 className="text-3xl font-bold text-slate-100">{t('title')}</h1>
      <p className="text-slate-300">{t('description')}</p>
      <Link
        href={`/${locale}`}
        className="rounded-full bg-sky-500/90 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
      >
        {t('cta')}
      </Link>
    </div>
  );
}
