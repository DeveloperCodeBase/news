export default function AboutPage({ params }: { params: { locale: string } }) {
  const isFa = params.locale === 'fa';
  return (
    <main dir={isFa ? 'rtl' : 'ltr'} className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16 text-slate-100">
      <header className="space-y-2 text-center">
        <h1 className="text-4xl font-bold">
          {isFa ? 'دربارهٔ مجلهٔ خبری ویستا' : 'About Vista AI News'}
        </h1>
        <p className="text-slate-300">
          {isFa
            ? 'مجلهٔ خبری ویستا توسط شبکه هوشمند ابتکار ویستا توسعه داده می‌شود تا تازه‌ترین اخبار و تحلیل‌های حوزهٔ هوش مصنوعی را با تمرکز بر مخاطبان فارسی‌زبان ارائه کند.'
            : 'Vista AI News is produced by Vista Innovative Intelligence Network to deliver timely AI updates and insight to Persian-speaking professionals.'}
        </p>
      </header>
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-6 leading-relaxed text-slate-200">
        <p>
          {isFa
            ? 'هدف ما ایجاد یک مرجع قابل‌اعتماد برای رهگیری پیشرفت‌های هوش مصنوعی است؛ از پژوهش‌های آکادمیک و معرفی ابزارهای جدید گرفته تا تحلیل سیاست‌گذاری و اثرات اجتماعی فناوری.'
            : 'Our goal is to become a trusted hub for tracking AI breakthroughs—from academic research and tooling to policy analysis and the societal impact of intelligent systems.'}
        </p>
        <p>
          {isFa
            ? 'با استفاده از پایپلاین جمع‌آوری خبر، ترجمهٔ ماشینی، و فرآیند بازبینی انسانی، اطمینان می‌دهیم که هر خبر با دقت و همراه با منبع معتبر منتشر شود.'
            : 'Through automated ingestion, machine translation, and human editorial review, each published story includes verified context and trusted sourcing.'}
        </p>
        <p>
          {isFa
            ? 'در نسخه‌های آینده، امکاناتی مانند جست‌وجوی پیشرفته، داشبورد ادمین، صف بازبینی، و ترجمهٔ دوطرفهٔ فارسی/انگلیسی ارائه خواهد شد.'
            : 'Upcoming releases will add advanced search, a full editorial dashboard, review queues, and bidirectional Persian/English translation workflows.'}
        </p>
      </section>
    </main>
  );
}
