CREATE TABLE IF NOT EXISTS "TranslationFailure" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TranslationFailure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TranslationFailure_createdAt_idx" ON "TranslationFailure" ("createdAt");
