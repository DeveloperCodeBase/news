'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    try {
      setIsLoading(true);
      await signIn('google', { callbackUrl: '/admin' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">ورود به پنل مدیریت</h1>
        <p className="text-sm text-slate-400">
          ورود تنها با حساب‌های جیمیل مجاز (تعریف شده در متغیر محیطی ADMIN/EDITOR_EMAILS).
        </p>
      </div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
      >
        {isLoading ? 'در حال انتقال…' : 'ورود با Google'}
      </button>
    </div>
  );
}
