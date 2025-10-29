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
  QUEUE_DATABASE_URL: z.string().url().optional(),
  JOB_QUEUE_SCHEMA: z.string().optional(),
  LT_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_PROJECT_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  ALERT_EMAIL: z.string().email().optional()
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
