import { cookies } from 'next/headers';
import LoginForm from '@/components/auth/login-form';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from '@/lib/i18n/config';

export const metadata = {
  title: 'ورود مدیران - مجله هوش گیت',
  description: 'Sign in to manage AI news ingestion, review, and publication.'
};

export default function LoginPage() {
  const localeCookie = cookies().get('NEXT_LOCALE')?.value;
  const locale = SUPPORTED_LOCALES.includes((localeCookie as AppLocale) ?? DEFAULT_LOCALE)
    ? ((localeCookie as AppLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <div
      dir={direction}
      className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16"
    >
      <LoginForm />
    </div>
  );
}
