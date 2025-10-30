import { prisma } from '@/lib/db/client';
import { getEnv } from '@/lib/env';
import { JOB_NAMES } from './queue';
import { recordQueueSnapshot, recordAlertEvent, startCronHeartbeat, finishCronHeartbeat } from '@/lib/monitoring/heartbeat';
import { sendAlertEmail } from '@/lib/email/mailer';
import { sendAlertSms } from '@/lib/alerts/sms';

const QUEUE_NAMES = Object.values(JOB_NAMES);

export async function collectQueueHealth() {
  const heartbeat = await startCronHeartbeat('monitor.queue');
  const env = getEnv();
  const schema = env.JOB_QUEUE_SCHEMA ?? 'pgboss';
  const backlogThreshold = env.QUEUE_BACKLOG_ALERT_THRESHOLD ?? 25;
  const failureThreshold = env.QUEUE_FAILURE_ALERT_THRESHOLD ?? 1;

  try {
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

    const rows = await prisma.$queryRawUnsafe<
      { name: string; waiting: number; active: number; completed: number; failed: number }[]
    >(query, QUEUE_NAMES);

    for (const row of rows) {
      await recordQueueSnapshot({
        queue: row.name,
        waiting: Number(row.waiting ?? 0),
        active: Number(row.active ?? 0),
        completed: Number(row.completed ?? 0),
        failed: Number(row.failed ?? 0)
      });

      if (row.waiting >= backlogThreshold || row.failed >= failureThreshold) {
        const subject = `هشدار صف کاری: ${row.name}`;
        const message = `صف ${row.name} با ${row.waiting} کار در انتظار و ${row.failed} خطای فعال مواجه است.`;

        await recordAlertEvent({
          channel: 'system',
          severity: row.failed >= failureThreshold ? 'critical' : 'warning',
          subject,
          message,
          metadata: row
        });

        await sendAlertEmail({
          subject: `${subject} (Email)`,
          html: `<p>${message}</p>`
        });

        await sendAlertSms({ subject, message });
      }
    }

    await finishCronHeartbeat(heartbeat.id, 'success', { startedAt: heartbeat.startedAt });
  } catch (error) {
    await finishCronHeartbeat(heartbeat.id, 'error', {
      startedAt: heartbeat.startedAt,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
