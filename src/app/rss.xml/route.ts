import { NextResponse } from 'next/server';
import { getHomepageArticles } from '@/lib/db/articles';
import { getLocalizedValue } from '@/lib/news/localization';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir';
  const articles = await getHomepageArticles(20);

  const items = articles
    .map((article) => {
      const title = getLocalizedValue(article, 'fa', 'title');
      const description = getLocalizedValue(article, 'fa', 'excerpt');
      return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${siteUrl}/fa/news/${article.slug}</link>
      <guid isPermaLink="false">${article.urlCanonical}</guid>
      <description><![CDATA[${description ?? ''}]]></description>
      <pubDate>${article.publishedAt.toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Vista AI News</title>
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
