import OpenAI from 'openai';
import { prisma } from '../db/client';
import { getEnv } from '../env';
import { getTehranDateKey, getTehranStartOfDay } from '../time/jalali';

export type OpenAIMode = 'full' | 'cheap' | 'off';

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

let client: OpenAI | null = null;

function resolveMode(): OpenAIMode {
  const { OPENAI_MODE } = getEnv();
  return OPENAI_MODE ?? 'full';
}

export function getOpenAIMode(): OpenAIMode {
  return resolveMode();
}

function getClient(): OpenAI | null {
  const { OPENAI_API_KEY } = getEnv();
  if (!OPENAI_API_KEY) {
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return client;
}

async function getUsageForToday(dateKey: string) {
  const existing = await prisma.aiUsage.findUnique({ where: { date: dateKey } });
  return {
    tokensIn: existing?.tokensIn ?? 0,
    tokensOut: existing?.tokensOut ?? 0
  };
}

async function recordUsage(dateKey: string, tokensIn: number, tokensOut: number) {
  if (tokensIn === 0 && tokensOut === 0) {
    return;
  }
  await prisma.aiUsage.upsert({
    where: { date: dateKey },
    update: {
      tokensIn: { increment: tokensIn },
      tokensOut: { increment: tokensOut }
    },
    create: {
      date: dateKey,
      tokensIn,
      tokensOut
    }
  });
}

export type ChatCompletionExecutor<T> = (client: OpenAI) => Promise<T>;

export async function callOpenAI<T extends { usage?: { prompt_tokens?: number; completion_tokens?: number } }>(
  executor: ChatCompletionExecutor<T>,
  options: { maxExpectedTokens?: number; requireFullMode?: boolean } = {}
): Promise<T | null> {
  const mode = resolveMode();
  if (mode === 'off' || (mode === 'cheap' && options.requireFullMode)) {
    throw new BudgetExceededError('OpenAI usage disabled by configuration');
  }

  const openaiClient = getClient();
  if (!openaiClient) {
    return null;
  }

  const { OPENAI_MAX_DAILY_TOKENS } = getEnv();
  const budget = OPENAI_MAX_DAILY_TOKENS ?? undefined;
  const dateKey = getTehranDateKey();
  const usage = await getUsageForToday(dateKey);
  const usedTokens = usage.tokensIn + usage.tokensOut;
  const expected = options.maxExpectedTokens ?? 0;

  if (budget && usedTokens + expected >= budget) {
    throw new BudgetExceededError('OpenAI daily budget exhausted');
  }

  const response = await executor(openaiClient);

  const promptTokens = response.usage?.prompt_tokens ?? 0;
  const completionTokens = response.usage?.completion_tokens ?? 0;
  await recordUsage(dateKey, promptTokens, completionTokens);

  const newTotal = usedTokens + promptTokens + completionTokens;
  if (budget && newTotal >= budget) {
    throw new BudgetExceededError('OpenAI daily budget exhausted');
  }

  return response;
}

export async function hasRemainingBudget(): Promise<boolean> {
  const { OPENAI_MAX_DAILY_TOKENS } = getEnv();
  if (!OPENAI_MAX_DAILY_TOKENS) {
    return true;
  }
  const dateKey = getTehranDateKey();
  const usage = await getUsageForToday(dateKey);
  return usage.tokensIn + usage.tokensOut < OPENAI_MAX_DAILY_TOKENS;
}

export function resetOpenAIUsageCache() {
  client = null;
}

export function getTodayBudgetWindow() {
  const start = getTehranStartOfDay();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
