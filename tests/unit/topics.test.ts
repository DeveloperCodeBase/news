import { describe, expect, it } from 'vitest';
import { predictTopics } from '@/lib/news/topics';

describe('predictTopics', () => {
  it('returns keyword based predictions when ONNX is unavailable', async () => {
    const text = 'This research paper introduces a new safety framework for large language models in industry.';
    const topics = await predictTopics(text);
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.map((item) => item.label)).toContain('پژوهش پیشرفته');
  });
});
