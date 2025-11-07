import { Status } from '@prisma/client';
import { prisma } from '../db/client';
import { withPrismaConnectionFallback } from '../db/errors';

export type HeartbeatRecord = {
  id: string;
  job: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  message: string | null;
  createdAt: string;
};

export type QueueSnapshotRecord = {
  id: string;
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  createdAt: string;
};

export type AlertEventRecord = {
  id: string;
  channel: string;
  severity: string;
  subject: string;
  message: string;
  createdAt: string;
};

export type IngestionSnapshot = {
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  lastRunMetrics: {
    fetched?: number;
    created?: number;
    skipped?: number;
    pendingReview?: number;
  } | null;
  pendingReviewCount: number;
};

export type MonitoringSnapshot = {
  heartbeats: HeartbeatRecord[];
  queueSnapshots: QueueSnapshotRecord[];
  alerts: AlertEventRecord[];
  ingestion: IngestionSnapshot;
};

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function serializeHeartbeats(records: Awaited<ReturnType<typeof prisma.cronHeartbeat.findMany>>): HeartbeatRecord[] {
  return records.map((record) => ({
    id: record.id,
    job: record.job,
    status: record.status,
    startedAt: record.startedAt.toISOString(),
    finishedAt: toIso(record.finishedAt),
    durationMs: record.durationMs ?? null,
    message: record.message ?? null,
    createdAt: record.createdAt.toISOString()
  }));
}

function serializeQueueSnapshots(records: Awaited<ReturnType<typeof prisma.queueSnapshot.findMany>>): QueueSnapshotRecord[] {
  return records.map((record) => ({
    id: record.id,
    queue: record.queue,
    waiting: record.waiting,
    active: record.active,
    completed: record.completed,
    failed: record.failed,
    createdAt: record.createdAt.toISOString()
  }));
}

function serializeAlerts(records: Awaited<ReturnType<typeof prisma.alertEvent.findMany>>): AlertEventRecord[] {
  return records.map((record) => ({
    id: record.id,
    channel: record.channel,
    severity: record.severity,
    subject: record.subject,
    message: record.message,
    createdAt: record.createdAt.toISOString()
  }));
}

function parseMetrics(message: string | null): IngestionSnapshot['lastRunMetrics'] {
  if (!message) return null;
  try {
    const parsed = JSON.parse(message) as Record<string, unknown>;
    const metrics: IngestionSnapshot['lastRunMetrics'] = {};
    if (typeof parsed.fetched === 'number') metrics.fetched = parsed.fetched;
    if (typeof parsed.created === 'number') metrics.created = parsed.created;
    if (typeof parsed.skipped === 'number') metrics.skipped = parsed.skipped;
    if (typeof parsed.pendingReview === 'number') metrics.pendingReview = parsed.pendingReview;
    return Object.keys(metrics).length ? metrics : null;
  } catch {
    return null;
  }
}

export async function getMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const [
    heartbeatsRaw,
    queueSnapshotsRaw,
    alertsRaw,
    pendingReviewCount,
    latestIngestion,
    latestIngestionSuccess,
    latestIngestionError
  ] = await Promise.all([
    withPrismaConnectionFallback(
      () =>
        prisma.cronHeartbeat.findMany({
          orderBy: { createdAt: 'desc' },
          take: 40
        }),
      [] as Awaited<ReturnType<typeof prisma.cronHeartbeat.findMany>>
    ),
    withPrismaConnectionFallback(
      () =>
        prisma.queueSnapshot.findMany({
          orderBy: { createdAt: 'desc' },
          take: 40
        }),
      [] as Awaited<ReturnType<typeof prisma.queueSnapshot.findMany>>
    ),
    withPrismaConnectionFallback(
      () =>
        prisma.alertEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 25
        }),
      [] as Awaited<ReturnType<typeof prisma.alertEvent.findMany>>
    ),
    withPrismaConnectionFallback(
      () =>
        prisma.article.count({
          where: { status: { in: [Status.REVIEWED, Status.DRAFT] } }
        }),
      0
    ),
    withPrismaConnectionFallback(
      () =>
        prisma.cronHeartbeat.findFirst({
          where: { job: 'ingestion' },
          orderBy: { createdAt: 'desc' }
        }),
      null
    ),
    withPrismaConnectionFallback(
      () =>
        prisma.cronHeartbeat.findFirst({
          where: { job: 'ingestion', status: 'success' },
          orderBy: { createdAt: 'desc' }
        }),
      null
    ),
    withPrismaConnectionFallback(
      () =>
        prisma.cronHeartbeat.findFirst({
          where: { job: 'ingestion', status: 'error' },
          orderBy: { createdAt: 'desc' }
        }),
      null
    )
  ]);

  const heartbeats = serializeHeartbeats(heartbeatsRaw);
  const queueSnapshots = serializeQueueSnapshots(queueSnapshotsRaw);
  const alerts = serializeAlerts(alertsRaw);

  const ingestion: IngestionSnapshot = {
    lastRunAt: toIso(latestIngestion?.finishedAt ?? latestIngestion?.startedAt ?? null),
    lastSuccessAt: toIso(latestIngestionSuccess?.finishedAt ?? latestIngestionSuccess?.startedAt ?? null),
    lastErrorAt: toIso(latestIngestionError?.finishedAt ?? latestIngestionError?.startedAt ?? null),
    lastErrorMessage: latestIngestionError?.message ?? null,
    lastRunMetrics: parseMetrics(latestIngestion?.message ?? null),
    pendingReviewCount
  };

  return {
    heartbeats,
    queueSnapshots,
    alerts,
    ingestion
  };
}
