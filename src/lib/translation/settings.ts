import type { TranslationSettings } from '@prisma/client';
import { prisma } from '../db/client';

let cachedSettings: TranslationSettings | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

export async function getTranslationSettings(): Promise<TranslationSettings> {
  const now = Date.now();

  if (cachedSettings && now - cachedAt < CACHE_MS) {
    return cachedSettings;
  }

  const settings = await prisma.translationSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  });

  cachedSettings = settings;
  cachedAt = now;

  return settings;
}

export function resetTranslationSettingsCache() {
  cachedSettings = null;
  cachedAt = 0;
}
