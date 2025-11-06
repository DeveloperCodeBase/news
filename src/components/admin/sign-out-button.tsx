'use client';

import { useTransition } from 'react';
import { signOut } from 'next-auth/react';
import clsx from 'clsx';

type SignOutButtonProps = {
  className?: string;
};

export default function SignOutButton({ className }: SignOutButtonProps = {}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await signOut({ callbackUrl: '/' });
        })
      }
      disabled={isPending}
      className={clsx(
        'rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-60',
        className
      )}
    >
      {isPending ? 'در حال خروج…' : 'خروج'}
    </button>
  );
}
