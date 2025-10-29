'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const supabase = useSupabaseBrowserClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await supabase.auth.signOut();
          router.replace('/');
        })
      }
      disabled={isPending}
      className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-60"
    >
      {isPending ? 'در حال خروج…' : 'خروج'}
    </button>
  );
}
