import type { TranslationProvider, TranslationSettings } from '@prisma/client';

export function chooseTranslationProvider(settings: TranslationSettings): TranslationProvider {
  if (!settings.allowLibreExperimental) {
    if (settings.defaultProvider === 'LIBRETRANSLATE') {
      return 'OPENAI';
    }
    if (settings.fallbackProvider === 'LIBRETRANSLATE') {
      return settings.defaultProvider ?? 'OPENAI';
    }
  }

  if (settings.defaultProvider === 'DISABLED') {
    return 'DISABLED';
  }

  if (settings.defaultProvider === 'OPENAI') {
    return 'OPENAI';
  }

  if (settings.defaultProvider === 'LIBRETRANSLATE' && settings.allowLibreExperimental) {
    return 'LIBRETRANSLATE';
  }

  return 'OPENAI';
}
