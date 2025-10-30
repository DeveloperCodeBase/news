import { describe, expect, it } from 'vitest';
import { classifyText } from '@/lib/news/classifier';

describe('classifyText', () => {
  it('detects categories and tags from English keywords', () => {
    const result = classifyText('OpenAI launches a new GPT tool for developers with open source SDK');
    expect(result.categories).toContain('news');
    expect(result.categories).toContain('tools');
    expect(result.tags).toContain('llm');
    expect(result.tags).toContain('open-source');
  });

  it('detects Persian keywords', () => {
    const result = classifyText('این راهنما نحوه استفاده از یک ابزار بینایی کامپیوتری را آموزش می‌دهد');
    expect(result.categories).toContain('tutorials');
    expect(result.tags).toContain('vision');
  });
});
