import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translateWithCache } from '@/lib/translation/provider';
import { Lang } from '@prisma/client';
import { resetEnvCache } from '@/lib/env';

const store = new Map<string, any>();
const findUniqueMock = vi.fn(async ({ where: { hash } }: any) => store.get(hash) ?? null);
const createMock = vi.fn(async ({ data }: any) => {
  store.set(data.hash, data);
  return data;
});

vi.mock('@/lib/db/client', () => ({
  prisma: {
    translationCache: {
      findUnique: findUniqueMock,
      create: createMock
    }
  }
}));

describe('translateWithCache integration', () => {
  beforeEach(() => {
    store.clear();
    findUniqueMock.mockClear();
    createMock.mockClear();
    resetEnvCache();
    process.env.LT_URL = 'https://lt.local/translate';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ translatedText: 'سلام' })
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('translates text and caches provider response', async () => {
    const { translated, providerId } = await translateWithCache({
      text: 'hello world',
      sourceLang: Lang.EN,
      targetLang: Lang.FA
    });

    expect(translated).toBe('سلام');
    expect(providerId).toBe('libretranslate');
    expect(createMock).toHaveBeenCalledOnce();
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect((global.fetch as any).mock.calls[0][0]).toBe('https://lt.local/translate');
  });

  it('uses cached translation on subsequent requests', async () => {
    await translateWithCache({ text: 'cached text', sourceLang: Lang.EN, targetLang: Lang.FA });
    (global.fetch as any).mockClear();

    const { translated } = await translateWithCache({
      text: 'cached text',
      sourceLang: Lang.EN,
      targetLang: Lang.FA
    });

    expect(translated).toBe('سلام');
    expect(createMock).toHaveBeenCalledTimes(1);
    expect((global.fetch as any).mock.calls.length).toBe(0);
  });
});
