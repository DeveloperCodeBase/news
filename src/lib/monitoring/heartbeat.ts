import { prisma } from '@/lib/db/client';
import type { Prisma } from '@prisma/client';

export type CronStatus = 'running' | 'success' | 'error';

export async function startCronHeartbeat(job: string, message?: string) {
  const record = await prisma.cronHeartbeat.create({
    data: {
      job,
      status: 'running',
      message,
      startedAt: new Date()
    }
  });
  return record;
}

type FinishPayload = {
  message?: string | Record<string, unknown>;
  startedAt?: Date;
};

export async function finishCronHeartbeat(id: string, status: CronStatus, payload?: FinishPayload) {
  const finishedAt = new Date();
  const startedAt = payload?.startedAt;
  const durationMs = startedAt ? finishedAt.getTime() - startedAt.getTime() : undefined;
  const messageValue =
    typeof payload?.message === 'string'
      ? payload.message
      : payload?.message
      ? JSON.stringify(payload.message)
      : undefined;

  await prisma.cronHeartbeat.update({
    where: { id },
    data: {
      status,
      finishedAt,
      durationMs,
      message: messageValue
    }
  });
}

export async function recordQueueSnapshot(data: {
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}) {
  await prisma.queueSnapshot.create({
    data: {
      queue: data.queue,
      waiting: data.waiting,
      active: data.active,
      completed: data.completed,
      failed: data.failed
    }
  });
}

export async function recordAlertEvent({
  channel,
  severity,
  subject,
  message,
  metadata
}: {
  channel: 'email' | 'sms' | 'system';
  severity: 'info' | 'warning' | 'critical';
  subject: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.alertEvent.create({
    data: {
      channel,
      severity,
      subject,
      message,
      metadata
    }
  });
}
