const CONTACT_INFO = {
  ceo: 'مسعود بخشی',
  phone: '۰۹۱۲۴۷۳۳۲۳۴',
  email: 'devcodebase.dec@gmail.com'
};

export default function ContactPage({ params }: { params: { locale: string } }) {
  const isFa = params.locale === 'fa';
  return (
    <main dir={isFa ? 'rtl' : 'ltr'} className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2 text-center">
        <h1 className="text-4xl font-bold text-slate-100">
          {isFa ? 'تماس با ما' : 'Contact Us'}
        </h1>
        <p className="text-slate-300">
          {isFa
            ? 'برای همکاری‌ها، ارسال خبر یا سوالات رسانه‌ای با ما در ارتباط باشید.'
            : 'Reach out for partnerships, press inquiries, or editorial questions.'}
        </p>
      </header>
      <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-slate-100">
        <div>
          <h2 className="text-sm uppercase tracking-wide text-slate-400">
            {isFa ? 'مدیرعامل' : 'Chief Executive Officer'}
          </h2>
          <p className="text-lg font-medium">{CONTACT_INFO.ceo}</p>
        </div>
        <div>
          <h2 className="text-sm uppercase tracking-wide text-slate-400">
            {isFa ? 'شماره تماس' : 'Phone'}
          </h2>
          <p className="text-lg font-medium ltr:font-mono">{CONTACT_INFO.phone}</p>
        </div>
        <div>
          <h2 className="text-sm uppercase tracking-wide text-slate-400">
            Email
          </h2>
          <a className="text-lg font-medium underline" href={`mailto:${CONTACT_INFO.email}`}>
            {CONTACT_INFO.email}
          </a>
        </div>
      </section>
    </main>
  );
}
