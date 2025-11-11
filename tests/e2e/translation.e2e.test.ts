import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translateWithCache } from '@/lib/translation/provider';
import { Lang } from '@prisma/client';
import { resetEnvCache } from '@/lib/env';

const mockSettings = {
  id: 1,
  enabled: true,
  defaultProvider: 'LIBRETRANSLATE' as const,
  allowLibreExperimental: true,
  fallbackProvider: null,
  openaiModel: 'gpt-4o-mini',
  dailyBudgetUsd: 10,
  dailyTokenLimit: 500000,
  budgetExhaustedMode: 'SHOW_ENGLISH' as const,
  createdAt: new Date(),
  updatedAt: new Date()
};

const store = new Map<string, any>();
const findUniqueMock = vi.fn(async ({ where: { hash } }: any) => store.get(hash) ?? null);
const upsertMock = vi.fn(async ({ create, update, where: { hash } }: any) => {
  const value = store.has(hash) ? { ...store.get(hash), ...update } : create;
  store.set(hash, value);
  return value;
});

vi.mock('@/lib/db/client', () => ({
  prisma: {
    translationCache: {
      findUnique: findUniqueMock,
      upsert: upsertMock
    },
    translationFailure: {
      create: vi.fn()
    }
  }
}));

vi.mock('@/lib/translation/settings', () => ({
  getTranslationSettings: vi.fn(async () => mockSettings),
  resetTranslationSettingsCache: vi.fn()
}));

vi.mock('@/lib/translation/budget', () => ({
  getTodayCost: vi.fn(async () => ({ costUsd: 0, tokens: 0 }))
}));

describe('translateWithCache integration', () => {
  beforeEach(() => {
    store.clear();
    findUniqueMock.mockClear();
    upsertMock.mockClear();
    resetEnvCache();
    process.env.LT_URL = 'https://lt.local/translate';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ translatedText: 'سلام' })
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('translates text and caches provider response', async () => {
    const { translated, providerId, cached } = await translateWithCache({
      text: 'hello world',
      sourceLang: Lang.EN,
      targetLang: Lang.FA
    });

    expect(translated).toBe('سلام');
    expect(providerId).toBe('LIBRETRANSLATE');
    expect(cached).toBe(false);
    expect(upsertMock).toHaveBeenCalledOnce();
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect((global.fetch as any).mock.calls[0][0]).toBe('https://lt.local/translate');
  });

  it('uses cached translation on subsequent requests', async () => {
    await translateWithCache({ text: 'cached text', sourceLang: Lang.EN, targetLang: Lang.FA });
    (global.fetch as any).mockClear();

    const { translated, cached } = await translateWithCache({
      text: 'cached text',
      sourceLang: Lang.EN,
      targetLang: Lang.FA
    });

    expect(translated).toBe('سلام');
    expect(cached).toBe(true);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect((global.fetch as any).mock.calls.length).toBe(0);
  });
});
