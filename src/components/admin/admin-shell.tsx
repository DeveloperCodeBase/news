import Link from 'next/link';
import { ReactNode } from 'react';
import SignOutButton from './sign-out-button';

type AdminShellProps = {
  email: string;
  role: string;
  children: ReactNode;
};

const navItems = [
  { href: '/admin', label: 'صف بازبینی' }
];

export default function AdminShell({ email, role, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold">پنل مدیریت ویستا</p>
            <p className="text-sm text-slate-400">
              {email} · نقش: <span className="font-medium text-emerald-400">{role}</span>
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
