import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://news.vista-ai.ir'),
  NEXT_PUBLIC_DEFAULT_LANG: z.string().default('fa'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  INTERNAL_API_URL: z.string().url().optional(),
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
