CREATE TYPE "TranslationProvider" AS ENUM ('OPENAI', 'LIBRETRANSLATE', 'DISABLED');
CREATE TYPE "BudgetExhaustedMode" AS ENUM ('SHOW_ENGLISH', 'QUEUE_TOMORROW', 'SKIP');

CREATE TABLE "TranslationSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultProvider" "TranslationProvider" NOT NULL DEFAULT 'OPENAI',
    "allowLibreExperimental" BOOLEAN NOT NULL DEFAULT false,
    "fallbackProvider" "TranslationProvider",
    "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "dailyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "dailyTokenLimit" INTEGER NOT NULL DEFAULT 500000,
    "budgetExhaustedMode" "BudgetExhaustedMode" NOT NULL DEFAULT 'SHOW_ENGLISH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TranslationSettings_pkey" PRIMARY KEY ("id")
);

