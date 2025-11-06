import { ReactNode } from 'react';
import { Role } from '@prisma/client';
import type { AppLocale } from '@/lib/i18n/config';
import AdminHeader from './admin-header';

type AdminShellProps = {
  email: string;
  role: Role | string;
  locale: AppLocale;
  children: ReactNode;
};

const navItems = [
  { href: '/admin', label: 'صف بازبینی' },
  { href: '/admin/schedule', label: 'زمان‌بندی انتشار' },
  { href: '/admin/sources', label: 'منابع خبری' },
  { href: '/admin/analytics', label: 'تحلیل بازدید' },
  { href: '/admin/monitoring', label: 'مانیتورینگ' },
  { href: '/admin/newsletter', label: 'خبرنامه' }
];

function formatRole(role: Role | string) {
  const value = typeof role === 'string' ? role.toUpperCase() : role;
  switch (value) {
    case Role.ADMIN:
    case 'ADMIN':
      return 'مدیر کل';
    case Role.EDITOR:
    case 'EDITOR':
      return 'سردبیر';
    default:
      return 'همکار';
  }
}

export default function AdminShell({ email, role, locale, children }: AdminShellProps) {
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <div
      dir={direction}
      lang={locale}
      className="min-h-screen bg-slate-900 text-slate-100"
    >
      <AdminHeader
        email={email}
        locale={locale}
        navItems={navItems}
        roleLabel={formatRole(role)}
      />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="space-y-8">{children}</div>
      </main>
    </div>
  );
}
