import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_DEFAULT_LANG: z.string().default('fa'),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(10),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  ADMIN_EMAILS: z.string().optional(),
  EDITOR_EMAILS: z.string().optional(),
  CONTRIBUTOR_EMAILS: z.string().optional(),
  INTERNAL_API_URL: z.string().url().optional(),
  INTERNAL_API_TOKEN: z.string().min(16),
  MEDIA_UPLOAD_DIR: z.string().default('public/media'),
  QUEUE_DATABASE_URL: z
    .preprocess((value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }, z.string().url().optional()),
  JOB_QUEUE_SCHEMA: z
    .string()
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  TREND_MODEL_PATH: z.string().optional(),
  LT_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODE: z
    .enum(['full', 'cheap', 'off'])
    .default('full'),
  OPENAI_MAX_DAILY_TOKENS: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
    }),
  GOOGLE_PROJECT_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  ALERT_EMAIL: z.string().email().optional(),
  INGEST_CRON: z.string().default('*/15 * * * *'),
  PUBLISH_CRON: z.string().default('*/1 * * * *'),
  MONITOR_CRON: z.string().default('*/1 * * * *'),
  QUEUE_BACKLOG_ALERT_THRESHOLD: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }),
  QUEUE_FAILURE_ALERT_THRESHOLD: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.enum(['true', 'false']).optional(),
  SMTP_FROM: z.string().optional(),
  NEWSLETTER_RECIPIENTS: z.string().optional(),
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  WEB_PUSH_CONTACT_EMAIL: z.string().optional(),
  SMS_WEBHOOK_URL: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().url().optional()),
  SMS_WEBHOOK_TOKEN: z.string().optional(),
  SMS_RECIPIENTS: z.string().optional()
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}

export function resetEnvCache() {
  cachedEnv = null;
}
