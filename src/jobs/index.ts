import { fetchNews } from './fetch-news';
import { ALLOWLISTED_SOURCES } from '@/lib/news/sources';

export async function runIngestion() {
  const articles = await fetchNews({
    sources: ALLOWLISTED_SOURCES.map(({ feedUrl, isTrusted }) => ({ feedUrl, isTrusted }))
  });

  return {
    fetched: articles.length
  };
}
