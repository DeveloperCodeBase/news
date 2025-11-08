import { NextResponse } from 'next/server';
import { getHomepageArticles } from '@/lib/db/articles';
import { getLocalizedValue } from '@/lib/news/localization';

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hooshgate.ir';
  const articles = await getHomepageArticles(20);

  const items = articles
    .map((article) => {
      const title = getLocalizedValue(article, 'fa', 'title');
      const summary = getLocalizedValue(article, 'fa', 'summary');
      const description = summary || getLocalizedValue(article, 'fa', 'excerpt');
      const publishedAt = article.publishedAt ?? article.updatedAt ?? new Date();
      return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${siteUrl}/fa/news/${article.slug}</link>
      <guid isPermaLink="false">${article.urlCanonical}</guid>
      <description><![CDATA[${description ?? ''}]]></description>
      <pubDate>${publishedAt.toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Hoosh Gate Magazine</title>
    <link>${siteUrl}</link>
    <description>Latest updates on artificial intelligence in Persian and English.</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8'
    }
  });
}
