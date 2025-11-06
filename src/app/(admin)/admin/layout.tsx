import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import AdminShell from '@/components/admin/admin-shell';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from '@/lib/i18n/config';
import { isEditorialRole } from '@/lib/auth/permissions';
import { authOptions } from '@/lib/auth/options';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/login');
  }

  const role = session.user.role;

  if (!role || !isEditorialRole(role)) {
    redirect(`/${DEFAULT_LOCALE}`);
  }

  const localeCookie = cookies().get('NEXT_LOCALE')?.value;
  const locale = SUPPORTED_LOCALES.includes((localeCookie as AppLocale) ?? DEFAULT_LOCALE)
    ? ((localeCookie as AppLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  return (
    <AdminShell email={session.user.email} role={role} locale={locale}>
      {children}
    </AdminShell>
  );
}
