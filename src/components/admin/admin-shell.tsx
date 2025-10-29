import Link from 'next/link';
import { ReactNode } from 'react';
import { Role } from '@prisma/client';
import SignOutButton from './sign-out-button';

type AdminShellProps = {
  email: string;
  role: Role | string;
  children: ReactNode;
};

const navItems = [
  { href: '/admin', label: 'صف بازبینی' },
  { href: '/admin/schedule', label: 'زمان‌بندی انتشار' },
  { href: '/admin/sources', label: 'منابع خبری' },
  { href: '/admin/analytics', label: 'تحلیل بازدید' },
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

export default function AdminShell({ email, role, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold">پنل مدیریت ویستا</p>
            <p className="text-sm text-slate-400">
              {email} · نقش: <span className="font-medium text-emerald-400">{formatRole(role)}</span>
            </p>
          </div>
          <SignOutButton />
        </div>
        <nav className="mx-auto flex max-w-6xl space-x-6 px-6 pb-2 rtl:space-x-reverse">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-slate-300 hover:text-slate-50">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
