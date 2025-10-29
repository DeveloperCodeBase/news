import { getBoss, JOB_NAMES } from '@/jobs/queue';

async function main() {
  const boss = await getBoss();

  try {
    const names = Object.values(JOB_NAMES);
    const rows = [] as Array<{ name: string; new: number; active: number; completed: number; failed: number }>;

    for (const name of names) {
      const counts = await boss.getJobCounts(name);
      rows.push({ name, ...counts });
    }

    console.table(rows);
  } finally {
    await boss.stop();
  }
}

main().catch((error) => {
  console.error('Failed to read queue status', error);
  process.exit(1);
});
