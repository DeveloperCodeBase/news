import TranslationSettingsForm from '@/components/admin/translation-settings-form';
import { getTranslationSettings } from '@/lib/translation/settings';

export const dynamic = 'force-dynamic';

export default async function TranslationSettingsPage() {
  const settings = await getTranslationSettings();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">تنظیمات ترجمه</h1>
        <p className="text-slate-400">پیکربندی ارائه‌دهنده ترجمه و محدودیت‌های هزینه را از اینجا مدیریت کنید.</p>
      </header>
      <TranslationSettingsForm initialSettings={settings} />
    </section>
  );
}
