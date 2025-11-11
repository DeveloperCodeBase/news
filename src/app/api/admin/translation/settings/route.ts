import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authOptions } from '@/lib/auth/options';
import { normalizeRole } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { getTranslationSettings, resetTranslationSettingsCache } from '@/lib/translation/settings';

const updateSchema = z.object({
  enabled: z.boolean(),
  defaultProvider: z.enum(['OPENAI', 'LIBRETRANSLATE', 'DISABLED'] as const),
  allowLibreExperimental: z.boolean(),
  fallbackProvider: z
    .enum(['OPENAI', 'LIBRETRANSLATE', 'DISABLED'] as const)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  openaiModel: z.string().min(1),
  dailyBudgetUsd: z.number().min(0),
  dailyTokenLimit: z.number().int().min(0),
  budgetExhaustedMode: z.enum(['SHOW_ENGLISH', 'QUEUE_TOMORROW', 'SKIP'] as const)
});

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const role = normalizeRole(session.user.role);
  if (role !== Role.ADMIN) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET() {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const settings = await getTranslationSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const json = await request.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  let defaultProvider = data.defaultProvider;
  let fallbackProvider = data.fallbackProvider;

  if (!data.allowLibreExperimental) {
    if (defaultProvider === 'LIBRETRANSLATE') {
      defaultProvider = 'OPENAI';
    }
    fallbackProvider = null;
  }

  if (fallbackProvider && fallbackProvider !== 'LIBRETRANSLATE') {
    fallbackProvider = null;
  }

  const normalizedOpenaiModel = data.openaiModel.trim() || 'gpt-4o-mini';

  const settings = await prisma.translationSettings.upsert({
    where: { id: 1 },
    update: {
      enabled: data.enabled,
      defaultProvider,
      allowLibreExperimental: data.allowLibreExperimental,
      fallbackProvider,
      openaiModel: normalizedOpenaiModel,
      dailyBudgetUsd: data.dailyBudgetUsd,
      dailyTokenLimit: data.dailyTokenLimit,
      budgetExhaustedMode: data.budgetExhaustedMode
    },
    create: {
      enabled: data.enabled,
      defaultProvider,
      allowLibreExperimental: data.allowLibreExperimental,
      fallbackProvider,
      openaiModel: normalizedOpenaiModel,
      dailyBudgetUsd: data.dailyBudgetUsd,
      dailyTokenLimit: data.dailyTokenLimit,
      budgetExhaustedMode: data.budgetExhaustedMode
    }
  });

  resetTranslationSettingsCache();

  return NextResponse.json({ ok: true, settings });
}
