import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import AdminShell from '@/components/admin/admin-shell';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { isEditorialRole, normalizeRole } from '@/lib/auth/permissions';
import { ensureUser } from '@/lib/db/users';
import { Role } from '@prisma/client';
import type { Database } from '@/types/supabase';

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = createServerComponentClient<Database>({ cookies });
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const role = normalizeRole(session.user.user_metadata?.role);
  if (!role || !isEditorialRole(role)) {
    redirect(`/${DEFAULT_LOCALE}`);
  }

  const email = session.user.email ?? `${session.user.id}@supabase.local`;
  const prismaRole = Role[role as keyof typeof Role];
  await ensureUser(session.user.id, email, prismaRole);

  return <AdminShell email={email} role={role}>{children}</AdminShell>;
}
