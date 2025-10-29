import { NextResponse } from 'next/server';

const FEED_TEMPLATE = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Vista AI News</title>
    <link>${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://news.vista-ai.ir'}</link>
    <description>Latest updates on artificial intelligence in Persian and English.</description>
  </channel>
</rss>`;

export async function GET() {
  return new NextResponse(FEED_TEMPLATE, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8'
    }
  });
}
