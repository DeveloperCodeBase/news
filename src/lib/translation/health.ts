import type { Lang } from '@prisma/client';
import { prisma } from '../db/client';

export type TranslationFailureContext = {
  sourceLang: Lang;
  targetLang: Lang;
};

export type TranslationFailureRecord = {
  id: string;
  provider: string;
  message: string;
  context: TranslationFailureContext | null;
  createdAt: Date;
};

export type TranslationHealthSnapshot = {
  provider: string | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  lastErrorContext: TranslationFailureContext | null;
};

export async function recordTranslationFailure({
  provider,
  message,
  sourceLang,
  targetLang
}: {
  provider: string;
  message: string;
  sourceLang: Lang;
  targetLang: Lang;
}): Promise<void> {
  await prisma.translationFailure.create({
    data: {
      provider,
      message: message.slice(0, 1000),
      context: {
        sourceLang,
        targetLang
      }
    }
  });
}

export async function getTranslationHealthSnapshot(provider?: string): Promise<TranslationHealthSnapshot> {
  const [lastSuccess, lastFailure] = await Promise.all([
    prisma.translationCache.findFirst({
      where: provider ? { provider } : undefined,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.translationFailure.findFirst({
      where: provider ? { provider } : undefined,
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const resolvedProvider = provider ?? lastSuccess?.provider ?? lastFailure?.provider ?? null;

  return {
    provider: resolvedProvider,
    lastSuccessAt: lastSuccess?.createdAt ?? null,
    lastErrorAt: lastFailure?.createdAt ?? null,
    lastErrorMessage: lastFailure?.message ?? null,
    lastErrorContext: (lastFailure?.context as TranslationFailureContext | undefined) ?? null
  };
}

export async function listRecentTranslationFailures(limit = 10, provider?: string): Promise<TranslationFailureRecord[]> {
  const failures = await prisma.translationFailure.findMany({
    where: provider ? { provider } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return failures.map((failure) => ({
    id: failure.id,
    provider: failure.provider,
    message: failure.message,
    context: (failure.context as TranslationFailureContext | undefined) ?? null,
    createdAt: failure.createdAt
  }));
}

