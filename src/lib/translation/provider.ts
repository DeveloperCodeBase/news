import { createHash } from 'node:crypto';
import { prisma } from '../db/client';
import { getEnv } from '../env';
import type { Lang } from '@prisma/client';
import { recordTranslationFailure } from './health';

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

export function getActiveTranslationProvider(): TranslationProvider | null {
  return getProvider();
}

export async function translateWithCache({
  text,
  sourceLang,
  targetLang
}: {
  text: string;
  sourceLang: Lang;
  targetLang: Lang;
}, options: { bypassCache?: boolean; persist?: boolean } = {}): Promise<{
  translated: string | null;
  providerId: string | null;
  error: string | null;
  cached: boolean;
}> {
  if (!text.trim()) {
    return { translated: null, providerId: null, error: null, cached: false };
  }

  const provider = getProvider();
  if (!provider) {
    return { translated: null, providerId: null, error: 'no-provider', cached: false };
  }

  const hash = createHash('sha256')
    .update(`${provider.id}:${sourceLang}:${targetLang}:${text}`)
    .digest('hex');

  if (!options.bypassCache) {
    const cached = await prisma.translationCache.findUnique({ where: { hash } });
    if (cached) {
      return { translated: cached.translated, providerId: cached.provider, error: null, cached: true };
    }
  }

  try {
    const translated = await provider.translate(text, sourceLang, targetLang);

    if (options.persist !== false) {
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
    }

    return { translated, providerId: provider.id, error: null, cached: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
    console.warn(
      `[translation] Provider ${provider.id} failed (${sourceLang}->${targetLang}): ${message}`
    );
    await recordTranslationFailure({
      provider: provider.id,
      message,
      sourceLang,
      targetLang
    }).catch((err) => {
      console.warn('[translation] Failed to record translation failure', err);
    });
    return { translated: null, providerId: provider.id, error: message, cached: false };
  }
}
