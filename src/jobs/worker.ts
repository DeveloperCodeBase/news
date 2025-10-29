import { getBoss, JOB_NAMES } from './queue';
import { runIngestion } from './index';
import { runRevalidate } from './revalidate';

export async function startQueueWorker() {
  const boss = await getBoss();

  await boss.work(JOB_NAMES.INGEST, async () => {
    const result = await runIngestion();
    return result;
  });

  await boss.work(JOB_NAMES.REVALIDATE, async (job) => {
    const slug = job.data.slug as string | undefined;
    if (!slug) {
      return;
    }
    await runRevalidate(slug);
  });

  // eslint-disable-next-line no-console
  console.log('Queue worker started and listening for jobs.');
}

if (import.meta.url === `file://${__filename}`) {
  startQueueWorker().catch((error) => {
    console.error('Failed to start worker', error);
    process.exit(1);
  });
}
