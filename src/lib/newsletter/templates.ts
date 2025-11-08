import type { Prisma } from '@prisma/client';

type ArticlePayload = Prisma.ArticleGetPayload<{
  select: {
    slug: true;
    titleFa: true;
    titleEn: true;
    excerptFa: true;
    excerptEn: true;
    summaryFa: true;
    summaryEn: true;
    publishedAt: true;
  };
}>;

type TemplateInput = {
  subject: string;
  intro: string;
  siteUrl: string;
  articles: ArticlePayload[];
};

type RenderedTemplate = {
  html: string;
  text: string;
};

function renderArticleList(items: ArticlePayload[], locale: 'fa' | 'en', siteUrl: string) {
  return items
    .map((article) => {
      const title = locale === 'fa' ? article.titleFa ?? article.titleEn ?? '' : article.titleEn ?? article.titleFa ?? '';
      const summary = locale === 'fa' ? article.summaryFa ?? article.summaryEn : article.summaryEn ?? article.summaryFa;
      const excerpt = summary ?? (locale === 'fa' ? article.excerptFa ?? article.excerptEn ?? '' : article.excerptEn ?? article.excerptFa ?? '');
      const link = `${siteUrl}/${locale}/news/${article.slug}`;
      const publication = article.publishedAt ?? new Date();
      return { title, excerpt, link, date: publication.toISOString().split('T')[0] };
    })
    .filter((item) => item.title);
}

export function renderNewsletterTemplate(variant: 'minimal' | 'story', input: TemplateInput): RenderedTemplate {
  const faArticles = renderArticleList(input.articles, 'fa', input.siteUrl);
  const baseIntro = `<p>${input.intro}</p>`;

  if (variant === 'story') {
    const htmlStories = faArticles
      .map(
        (article) =>
          `<article style="border-radius:16px;padding:18px;margin-bottom:16px;background:#0f172a;color:#f8fafc;font-family:'Vazirmatn',Tahoma,sans-serif;">
            <h2 style=\"margin:0 0 8px 0;font-size:20px;\">${article.title}</h2>
            <p style=\"margin:0 0 8px 0;line-height:1.6;\">${article.excerpt}</p>
            <a href=\"${article.link}\" style=\"color:#38bdf8;text-decoration:none;font-weight:600;\">ادامه خبر →</a>
            <div style=\"margin-top:12px;font-size:12px;color:#94a3b8;\">${article.date}</div>
          </article>`
      )
      .join('');

    const textStories = faArticles
      .map((article) => `${article.title}\n${article.excerpt}\n${article.link}\n${article.date}`)
      .join('\n\n');

    return {
      html: `<section style=\"background:#020617;padding:32px;\">${baseIntro}${htmlStories}</section>`,
      text: `${input.intro}\n\n${textStories}`
    };
  }

  const htmlList = faArticles
    .map(
      (article) =>
        `<li style=\"padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.2);\">
            <a href=\"${article.link}\" style=\"color:#38bdf8;font-size:18px;text-decoration:none;font-weight:600;\">${article.title}</a>
            <p style=\"margin:6px 0;font-size:14px;color:#cbd5f5;\">${article.excerpt}</p>
            <small style=\"color:#64748b;\">${article.date}</small>
          </li>`
    )
    .join('');

  const textList = faArticles
    .map((article) => `${article.title}\n${article.excerpt}\n${article.link}`)
    .join('\n\n');

  return {
    html: `<section style=\"background:#0f172a;padding:24px;border-radius:16px;color:#f8fafc;font-family:'Vazirmatn',Tahoma,sans-serif;\"><h2 style=\"margin-top:0;font-size:22px;\">${input.subject}</h2>${baseIntro}<ol style=\"padding:0 18px;list-style:decimal;\">${htmlList}</ol></section>`,
    text: `${input.subject}\n${input.intro}\n\n${textList}`
  };
}
