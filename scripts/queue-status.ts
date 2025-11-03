import { prisma } from '@/lib/db/client';
import { getEnv } from '@/lib/env';
import { JOB_NAMES } from '@/jobs/queue';

async function main() {
  try {
    const names = Object.values(JOB_NAMES);
    const env = getEnv();
    const schema = env.JOB_QUEUE_SCHEMA ?? 'pgboss';

    const query = `
      SELECT name,
             COUNT(*) FILTER (WHERE state = 'created') AS waiting,
             COUNT(*) FILTER (WHERE state = 'active') AS active,
             COUNT(*) FILTER (WHERE state = 'completed') AS completed,
             COUNT(*) FILTER (WHERE state = 'failed') AS failed
        FROM ${schema}."job"
       WHERE name = ANY($1::text[])
       GROUP BY name
    `;

    const results = await prisma.$queryRawUnsafe<
      { name: string; waiting: bigint | number | null; active: bigint | number | null; completed: bigint | number | null; failed: bigint | number | null }[]
    >(query, names);

    const counters = names.map((name) => {
      const row = results.find((item) => item.name === name);
      return {
        name,
        waiting: Number(row?.waiting ?? 0),
        active: Number(row?.active ?? 0),
        completed: Number(row?.completed ?? 0),
        failed: Number(row?.failed ?? 0)
      };
    });

    console.table(counters);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to read queue status', error);
  process.exit(1);
});
