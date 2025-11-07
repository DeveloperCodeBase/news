export type SeedNewsSource = {
  name: string;
  homepageUrl: string;
  rssUrl?: string;
  scrapeUrl?: string;
  language: string;
  region?: string;
  topicTags: string[];
  isTrusted?: boolean;
  enabled?: boolean;
  notes?: string;
  lastStatus?: 'OK' | 'ERROR' | 'UNKNOWN';
  lastStatusCode?: number | null;
  lastErrorMessage?: string | null;
};

export const EXAMPLE_NEWS_SOURCES: SeedNewsSource[] = [
  {
    name: 'OpenAI Blog',
    homepageUrl: 'https://openai.com/blog',
    rssUrl: 'https://openai.com/blog/rss/',
    language: 'en',
    topicTags: ['ai', 'llm', 'research'],
    notes: 'Official OpenAI announcements',
    lastStatus: 'ERROR',
    lastStatusCode: 403,
    lastErrorMessage: 'Status code 403 encountered in production logs'
  },
  {
    name: 'Google DeepMind Discover',
    homepageUrl: 'https://deepmind.google/discover',
    rssUrl: undefined,
    scrapeUrl: 'https://deepmind.google/discover',
    language: 'en',
    topicTags: ['ai', 'research', 'science'],
    notes: 'DeepMind articles and discoveries',
    lastStatus: 'ERROR',
    lastStatusCode: 404,
    lastErrorMessage: 'Legacy RSS feed returned 404'
  },
  {
    name: 'Anthropic Newsroom',
    homepageUrl: 'https://www.anthropic.com/news',
    rssUrl: undefined,
    scrapeUrl: 'https://www.anthropic.com/news',
    language: 'en',
    topicTags: ['ai', 'safety'],
    notes: 'Anthropic updates and policy notes',
    lastStatus: 'ERROR',
    lastStatusCode: 404,
    lastErrorMessage: 'RSS endpoint missing; requires HTML scraping'
  },
  {
    name: 'MIT News – Artificial Intelligence',
    homepageUrl: 'https://news.mit.edu/topic/artificial-intelligence2',
    rssUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
    language: 'en',
    topicTags: ['ai', 'research', 'academia'],
    notes: 'University research coverage'
  },
  {
    name: 'Microsoft Research – AI',
    homepageUrl: 'https://www.microsoft.com/en-us/research/blog/topic/artificial-intelligence/',
    rssUrl:
      'https://www.microsoft.com/en-us/research/blog/topic/artificial-intelligence/feed/',
    language: 'en',
    topicTags: ['ai', 'industry'],
    notes: 'Microsoft AI research updates'
  },
  {
    name: 'Meta AI',
    homepageUrl: 'https://ai.meta.com/blog/',
    rssUrl: 'https://ai.meta.com/blog/feed/',
    language: 'en',
    topicTags: ['ai', 'research', 'social'],
    notes: 'Meta AI team blog'
  },
  {
    name: 'NVIDIA Developer Blog – AI',
    homepageUrl: 'https://developer.nvidia.com/blog',
    rssUrl: 'https://developer.nvidia.com/blog/feed/',
    language: 'en',
    topicTags: ['ai', 'hardware', 'gpu']
  },
  {
    name: 'Hugging Face Blog',
    homepageUrl: 'https://huggingface.co/blog',
    rssUrl: 'https://huggingface.co/blog/feed.xml',
    language: 'en',
    topicTags: ['open-source', 'ai', 'llm']
  },
  {
    name: 'VentureBeat – AI',
    homepageUrl: 'https://venturebeat.com/category/ai/',
    rssUrl: 'https://venturebeat.com/category/ai/feed/',
    language: 'en',
    topicTags: ['industry', 'ai']
  },
  {
    name: 'MIT Technology Review – AI',
    homepageUrl: 'https://www.technologyreview.com/topic/artificial-intelligence/',
    rssUrl:
      'https://www.technologyreview.com/feed/?category_name=artificial-intelligence',
    language: 'en',
    topicTags: ['ai', 'policy', 'industry']
  },
  {
    name: 'Stanford HAI Blog',
    homepageUrl: 'https://hai.stanford.edu/news',
    rssUrl: 'https://hai.stanford.edu/rss.xml',
    language: 'en',
    topicTags: ['academia', 'policy', 'ai']
  },
  {
    name: 'Bloomberg AI',
    homepageUrl: 'https://www.bloomberg.com/topics/artificial-intelligence',
    rssUrl: undefined,
    scrapeUrl: 'https://www.bloomberg.com/topics/artificial-intelligence',
    language: 'en',
    topicTags: ['finance', 'industry', 'ai']
  },
  {
    name: 'Financial Times – Artificial Intelligence',
    homepageUrl: 'https://www.ft.com/artificial-intelligence',
    rssUrl: undefined,
    scrapeUrl: 'https://www.ft.com/artificial-intelligence',
    language: 'en',
    topicTags: ['finance', 'policy', 'ai']
  },
  {
    name: 'Wired – AI',
    homepageUrl: 'https://www.wired.com/tag/artificial-intelligence/',
    rssUrl: 'https://www.wired.com/feed/tag/artificial-intelligence/latest/rss',
    language: 'en',
    topicTags: ['culture', 'ai', 'society']
  },
  {
    name: 'The Verge – AI',
    homepageUrl: 'https://www.theverge.com/artificial-intelligence',
    rssUrl: 'https://www.theverge.com/rss/index.xml',
    language: 'en',
    topicTags: ['consumer', 'ai'],
    notes: 'Requires filtering for AI stories',
    enabled: false
  },
  {
    name: 'Nature Machine Intelligence',
    homepageUrl: 'https://www.nature.com/natmachintell/',
    rssUrl: 'https://www.nature.com/natmachintell.rss',
    language: 'en',
    topicTags: ['science', 'ai', 'research']
  },
  {
    name: 'ArXiv – Artificial Intelligence',
    homepageUrl: 'https://arxiv.org/list/cs.AI/recent',
    rssUrl: 'https://export.arxiv.org/rss/cs.AI',
    language: 'en',
    topicTags: ['research', 'preprint']
  },
  {
    name: 'AI Alignment Forum',
    homepageUrl: 'https://www.alignmentforum.org/',
    rssUrl: 'https://www.alignmentforum.org/feed.xml',
    language: 'en',
    topicTags: ['alignment', 'safety'],
    notes: 'Community discussions on AI alignment'
  },
  {
    name: 'EleutherAI Blog',
    homepageUrl: 'https://blog.eleuther.ai/',
    rssUrl: 'https://blog.eleuther.ai/feed.xml',
    language: 'en',
    topicTags: ['open-source', 'research', 'llm']
  },
  {
    name: 'Baai (Beijing Academy of AI)',
    homepageUrl: 'https://www.baai.ac.cn/news.html',
    rssUrl: undefined,
    scrapeUrl: 'https://www.baai.ac.cn/news.html',
    language: 'zh',
    region: 'CN',
    topicTags: ['ai', 'research', 'asia']
  }
];
