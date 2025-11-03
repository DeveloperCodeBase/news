'use client';

import { useState } from 'react';

export type NewsletterArticle = {
  id: string;
  title: string;
  excerpt?: string | null;
};

type NewsletterComposerProps = {
  articles: NewsletterArticle[];
};

export default function NewsletterComposer({ articles }: NewsletterComposerProps) {
  const [subject, setSubject] = useState('خبرنامه ویژه مجله هوش گیت');
  const [intro, setIntro] = useState('در این شماره مهم‌ترین خبرهای هوش مصنوعی را مرور می‌کنیم.');
  const [selectedArticles, setSelectedArticles] = useState<string[]>(() => articles.map((article) => article.id));
  const [recipients, setRecipients] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    const payload = {
      subject,
      intro,
      articleIds: selectedArticles,
      recipients: recipients
        ? recipients
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined
    };

    const response = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-inner shadow-slate-950/30"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-300">
          موضوع ایمیل
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          گیرندگان (اختیاری، جدا شده با کاما)
          <input
            value={recipients}
            onChange={(event) => setRecipients(event.target.value)}
            placeholder="editor@example.com,marketing@example.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>
      </div>
      <label className="space-y-1 text-sm text-slate-300">
        متن مقدمه
        <textarea
          value={intro}
          onChange={(event) => setIntro(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-300">مقالات انتخابی</legend>
        {articles.map((article) => {
          const checked = selectedArticles.includes(article.id);
          return (
            <label key={article.id} className="flex items-start gap-3 text-slate-200">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) =>
                  setSelectedArticles((current) =>
                    event.target.checked
                      ? [...current, article.id]
                      : current.filter((id) => id !== article.id)
                  )
                }
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
              />
              <span>
                <span className="font-medium text-slate-100">{article.title}</span>
                {article.excerpt ? <p className="text-xs text-slate-400">{article.excerpt}</p> : null}
              </span>
            </label>
          );
        })}
        {articles.length === 0 ? (
          <p className="text-sm text-slate-400">خبر منتشر شده‌ای برای ارسال خبرنامه وجود ندارد.</p>
        ) : null}
      </fieldset>
      <button
        type="submit"
        disabled={status === 'sending' || selectedArticles.length === 0}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
      >
        {status === 'sending' ? 'در حال ارسال…' : 'ارسال خبرنامه'}
      </button>
      {status === 'success' ? <p className="text-sm text-emerald-400">خبرنامه ارسال شد.</p> : null}
      {status === 'error' ? <p className="text-sm text-rose-400">ارسال خبرنامه با خطا مواجه شد.</p> : null}
    </form>
  );
}
