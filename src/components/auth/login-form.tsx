'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const supabase = useSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.replace('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-slate-800 bg-slate-900/80 p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-100">ورود به پنل مدیریت</h1>
        <p className="text-sm text-slate-400">با ایمیل سازمانی خود وارد شوید.</p>
      </div>
      <label className="block space-y-2">
        <span className="text-sm text-slate-300">ایمیل</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-slate-300">رمز عبور</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
        />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
      >
        {isSubmitting ? 'در حال ورود…' : 'ورود'}
      </button>
    </form>
  );
}
