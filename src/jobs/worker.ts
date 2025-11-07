import { getBoss, JOB_NAMES } from './queue';
import { runIngestion } from './index';
import { runRevalidate } from './revalidate';
import { publishScheduledArticle, releaseDueArticles } from './publish';
import { refreshTrendSnapshot } from './trends';
import { collectQueueHealth } from './monitoring';
import { getEnv } from '../lib/env';

export async function startQueueWorker() {
  const boss = await getBoss();
  const env = getEnv();

  await boss.schedule(JOB_NAMES.INGEST, env.INGEST_CRON ?? '*/5 * * * *', { triggeredBy: 'scheduler' });
  await boss.schedule(JOB_NAMES.PUBLISH_SCHEDULED, env.PUBLISH_CRON ?? '*/1 * * * *', {
    triggeredBy: 'scheduler'
  });
  await boss.schedule(JOB_NAMES.MONITOR_HEALTH, env.MONITOR_CRON ?? '*/1 * * * *', {});

  await boss.work(JOB_NAMES.INGEST, async () => {
    const result = await runIngestion();
    return result;
  });

  const extractField = (value: unknown, field: string): string | undefined => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    const fieldValue = record[field];
    return typeof fieldValue === 'string' && fieldValue.length > 0 ? fieldValue : undefined;
  };

  await boss.work(JOB_NAMES.REVALIDATE, async (job) => {
    const slug = extractField(job.data, 'slug');
    if (!slug) {
      return;
    }
    await runRevalidate(slug);
  });

  await boss.work(JOB_NAMES.PUBLISH_SCHEDULED, async (job) => {
    const articleId = extractField(job.data, 'articleId');
    if (!articleId) {
      await releaseDueArticles();
      return;
    }
    await publishScheduledArticle(articleId);
  });

  await boss.work(JOB_NAMES.TREND_REFRESH, async () => {
    await refreshTrendSnapshot();
  });

  await boss.work(JOB_NAMES.MONITOR_HEALTH, async () => {
    await collectQueueHealth();
  });

  // eslint-disable-next-line no-console
  console.log('Queue worker started and listening for jobs.');

  await releaseDueArticles();
}

if (import.meta.url === `file://${__filename}`) {
  startQueueWorker().catch((error) => {
    console.error('Failed to start worker', error);
    process.exit(1);
  });
}
