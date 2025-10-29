export type AllowlistedSource = {
  name: string;
  url: string;
  feedUrl: string;
  isTrusted: boolean;
};

export const ALLOWLISTED_SOURCES: AllowlistedSource[] = [
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog',
    feedUrl: 'https://openai.com/blog/rss/',
    isTrusted: true
  },
  {
    name: 'Google DeepMind',
    url: 'https://deepmind.google/',
    feedUrl: 'https://deepmind.google/feeds/news',
    isTrusted: true
  },
  {
    name: 'MIT News - AI',
    url: 'https://news.mit.edu/topic/artificial-intelligence2',
    feedUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
    isTrusted: false
  }
];
