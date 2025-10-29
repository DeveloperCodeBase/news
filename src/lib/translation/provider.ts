import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db/client';
import { getEnv } from '@/lib/env';
import type { Lang } from '@prisma/client';

type TranslationProvider = {
  id: string;
  translate: (text: string, sourceLang: Lang, targetLang: Lang) => Promise<string>;
};

class LibreTranslateProvider implements TranslationProvider {
  id = 'libretranslate';

  async translate(text: string, sourceLang: Lang, targetLang: Lang) {
    const { LT_URL } = getEnv();
    if (!LT_URL) {
      throw new Error('LT_URL is not configured');
    }

    const response = await fetch(LT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang.toLowerCase(),
        target: targetLang.toLowerCase(),
        format: 'text'
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`LibreTranslate failed: ${message}`);
    }

    const data = (await response.json()) as { translatedText: string };
    return data.translatedText;
  }
}

function getProvider(): TranslationProvider | null {
  const env = getEnv();
  if (env.LT_URL) {
    return new LibreTranslateProvider();
  }
  return null;
}

export async function translateWithCache({
  text,
  sourceLang,
  targetLang
}: {
  text: string;
  sourceLang: Lang;
  targetLang: Lang;
}): Promise<{ translated: string | null; providerId: string | null }> {
  if (!text.trim()) {
    return { translated: null, providerId: null };
  }

  const provider = getProvider();
  if (!provider) {
    return { translated: null, providerId: null };
  }

  const hash = createHash('sha256')
    .update(`${provider.id}:${sourceLang}:${targetLang}:${text}`)
    .digest('hex');

  const cached = await prisma.translationCache.findUnique({ where: { hash } });
  if (cached) {
    return { translated: cached.translated, providerId: cached.provider };
  }

  const translated = await provider.translate(text, sourceLang, targetLang);

  await prisma.translationCache.create({
    data: {
      hash,
      sourceLang,
      targetLang,
      sourceText: text,
      translated,
      provider: provider.id
    }
  });

  return { translated, providerId: provider.id };
}
