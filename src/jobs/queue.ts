import PgBoss from 'pg-boss';
import { getEnv } from '@/lib/env';

const JOB_NAMES = {
  INGEST: 'vista.ingest',
  REVALIDATE: 'vista.revalidate',
  PUBLISH_SCHEDULED: 'vista.publish',
  TREND_REFRESH: 'vista.trend-refresh'
} as const;

type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

let bossPromise: Promise<PgBoss> | null = null;

async function getBoss() {
  if (!bossPromise) {
    const env = getEnv();
    const connectionString = env.QUEUE_DATABASE_URL ?? env.DATABASE_URL;
    const schema = env.JOB_QUEUE_SCHEMA ?? 'pgboss';
    const boss = new PgBoss({ connectionString, schema });
    bossPromise = boss.start().then(() => boss);
  }

  return bossPromise;
}

export async function enqueueJob(
  name: JobName,
  payload: Record<string, unknown> = {},
  options?: PgBoss.SendOptions
) {
  const boss = await getBoss();
  return boss.send(name, payload, options ?? {});
}

export { JOB_NAMES, getBoss };
