import { createHash } from 'node:crypto';
import type { Lang } from '@prisma/client';
import { prisma } from '../db/client';
import { BudgetExceededError, callOpenAI } from '../ai/openai';
import { getEnv } from '../env';
import { getTranslationSettings } from './settings';
import { chooseTranslationProvider } from './provider-selection';
import { getTodayCost } from './budget';
import { recordTranslationFailure } from './health';

interface TranslationProvider {
  id: string;
  translate: (text: string, sourceLang: Lang, targetLang: Lang) => Promise<string>;
}

class OpenAITranslationProvider implements TranslationProvider {
  id: TranslationProvider['id'] = 'OPENAI';

  constructor(private readonly model: string) {}

  async translate(text: string, sourceLang: Lang, targetLang: Lang): Promise<string> {
    const response = await callOpenAI(
      (client) =>
        client.chat.completions.create({
          model: this.model,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                'You are a professional translator that converts English news writing into Persian (Farsi) while preserving meaning and tone.'
            },
            {
              role: 'user',
              content: `Translate the following text from ${sourceLang} to ${targetLang}:
\n${text}`
            }
          ]
        }),
      { maxExpectedTokens: Math.min(1500, Math.max(200, Math.ceil(text.length / 3))) }
    );

    if (!response) {
      throw new Error('OpenAI client unavailable');
    }

    const translated = response.choices[0]?.message?.content?.trim();
    if (!translated) {
      throw new Error('OpenAI returned empty translation');
    }

    return translated;
  }
}

class LibreTranslateProvider implements TranslationProvider {
  id: TranslationProvider['id'] = 'LIBRETRANSLATE';

  async translate(text: string, sourceLang: Lang, targetLang: Lang): Promise<string> {
    const { LT_URL } = getEnv();
    if (!LT_URL) {
      throw new Error('LT_URL is not configured');
    }

    const response = await fetch(LT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

async function resolveProvider(settingsParam?: Awaited<ReturnType<typeof getTranslationSettings>>): Promise<TranslationProvider | null> {
  const settings = settingsParam ?? (await getTranslationSettings());

  if (!settings.enabled) {
    return null;
  }

  const providerId = chooseTranslationProvider(settings);

  if (providerId === 'DISABLED') {
    return null;
  }

  if (providerId === 'OPENAI') {
    return new OpenAITranslationProvider(settings.openaiModel);
  }

  if (providerId === 'LIBRETRANSLATE') {
    if (!settings.allowLibreExperimental) {
      return null;
    }
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
}, options: { bypassCache?: boolean; persist?: boolean } = {}): Promise<{
  translated: string | null;
  providerId: string | null;
  error: string | null;
  cached: boolean;
}> {
  if (!text.trim()) {
    return { translated: null, providerId: null, error: null, cached: false };
  }

  const settings = await getTranslationSettings();
  if (!settings.enabled) {
    return { translated: null, providerId: null, error: 'disabled', cached: false };
  }

  const { costUsd, tokens } = await getTodayCost();
  if (costUsd >= settings.dailyBudgetUsd || tokens >= settings.dailyTokenLimit) {
    return { translated: null, providerId: null, error: 'budget-exhausted', cached: false };
  }

  const provider = await resolveProvider(settings);
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
      try {
        await prisma.translationCache.upsert({
          where: { hash },
          update: {
            sourceLang,
            targetLang,
            sourceText: text,
            translated,
            provider: provider.id
          },
          create: {
            hash,
            sourceLang,
            targetLang,
            sourceText: text,
            translated,
            provider: provider.id
          }
        });
      } catch (persistError) {
        const persistMessage =
          persistError instanceof Error
            ? persistError.message
            : typeof persistError === 'string'
              ? persistError
              : 'Unknown persistence error';
        console.error(
          `[translation] Failed to persist translation cache (${provider.id} ${sourceLang}->${targetLang})`,
          persistError
        );
        await recordTranslationFailure({
          provider: provider.id,
          message: persistMessage,
          sourceLang,
          targetLang,
          errorStack: persistError instanceof Error ? persistError.stack : undefined
        }).catch((err) => {
          console.error('[translation] Failed to record translation failure after persistence error', err);
        });
      }
    }

    return { translated, providerId: provider.id, error: null, cached: false };
  } catch (error) {
    const message =
      error instanceof BudgetExceededError
        ? error.message
        : error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';
    console.error(
      `[translation] Provider ${provider.id} failed (${sourceLang}->${targetLang}): ${message}`,
      error
    );
    await recordTranslationFailure({
      provider: provider.id,
      message,
      sourceLang,
      targetLang,
      errorStack: error instanceof Error ? error.stack : undefined
    }).catch((err) => {
      console.error('[translation] Failed to record translation failure', err);
    });
    return { translated: null, providerId: provider.id, error: message, cached: false };
  }
}
