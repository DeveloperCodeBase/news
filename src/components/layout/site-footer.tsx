import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/lib/i18n/config';

export default async function SiteFooter({ locale }: { locale: AppLocale }) {
  const t = await getTranslations('footer');
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <footer dir={direction} className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-slate-400">
        <p>{t('rights')}</p>
        <p>{t('newsletter')}</p>
      </div>
    </footer>
  );
}
