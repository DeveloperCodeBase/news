import Link from 'next/link';

export const dynamic = 'force-static';

const CTA_LINKS = [
  { href: '/admin', labelFa: 'پنل مدیریت', labelEn: 'Admin Panel' },
  { href: '/contact', labelFa: 'تماس با ما', labelEn: 'Contact' }
];

export default function LocaleHomePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const isFa = locale === 'fa';

  return (
    <main
      dir={isFa ? 'rtl' : 'ltr'}
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 py-12 text-center text-slate-100"
    >
      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
        Vista AI News
      </span>
      <h1 className="max-w-2xl text-balance text-4xl font-semibold sm:text-5xl">
        {isFa
          ? 'پروژهٔ مجلهٔ خبری هوش مصنوعی ویستا در حال ساخت است'
          : 'Vista AI bilingual AI news magazine is under active development'}
      </h1>
      <p className="max-w-2xl text-pretty text-base text-slate-300 sm:text-lg">
        {isFa
          ? 'این ریپو در حال آماده‌سازی زیرساخت کامل Next.js، Prisma، Supabase و ماژول‌های خبرخوان است. با دنبال کردن نقشهٔ راه، ویژگی‌های کامل جمع‌آوری خبر، ترجمهٔ خودکار و پنل مدیریت اضافه خواهند شد.'
          : 'The repository currently focuses on establishing the Next.js, Prisma, and Supabase foundation. Automated ingestion, translation, and editorial workflows will be layered on top as development progresses.'}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {CTA_LINKS.map((item) => (
          <Link
            key={item.href}
            href={`/${locale}${item.href}`}
            className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          >
            {isFa ? item.labelFa : item.labelEn}
          </Link>
        ))}
      </div>
      <div className="text-xs uppercase tracking-widest text-slate-500">
        {isFa ? 'نسخهٔ اولیهٔ محصول' : 'Initial foundation release'}
      </div>
    </main>
  );
}
