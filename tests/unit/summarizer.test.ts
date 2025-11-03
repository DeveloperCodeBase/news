import { describe, expect, it } from 'vitest';
import { summarizeText, buildBilingualSummaries } from '@/lib/news/summarizer';

describe('summarizer', () => {
  it('returns concise summary for Persian text', () => {
    const text =
      'مجله هوش گیت امروز مدل جدیدی معرفی کرد. این مدل سرعت بالایی دارد و برای زبان فارسی بهینه شده است. مجله اعلام کرد نسخه متن‌باز نیز منتشر خواهد شد.';
    const summary = summarizeText({ text, locale: 'fa' });
    expect(summary.length).toBeGreaterThan(10);
    expect(summary.includes('مجله هوش گیت')).toBe(true);
  });

  it('prefers english content when available', () => {
    const text =
      'Hoosh Gate Magazine released an updated inference stack. The stack improves response time and adds new observability hooks.';
    const summary = summarizeText({ text, locale: 'en' });
    expect(summary.length).toBeGreaterThan(10);
    expect(summary.toLowerCase()).toContain('hoosh gate');
  });

  it('builds bilingual summaries with fallbacks', () => {
    const { summaryFa, summaryEn } = buildBilingualSummaries({
      persian: 'مدل تازه‌ای برای ترجمه خودکار معرفی شد.',
      english: null
    });
    expect(summaryFa.length).toBeGreaterThan(5);
    expect(summaryEn.length).toBeGreaterThan(5);
  });
});
