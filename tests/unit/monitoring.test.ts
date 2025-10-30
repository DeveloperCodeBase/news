import { describe, expect, it, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db/client';
import { collectQueueHealth } from '@/jobs/monitoring';
import { resetEnvCache } from '@/lib/env';
import { startCronHeartbeat, finishCronHeartbeat, recordQueueSnapshot, recordAlertEvent } from '@/lib/monitoring/heartbeat';
import { sendAlertEmail } from '@/lib/email/mailer';
import { sendAlertSms } from '@/lib/alerts/sms';

vi.mock('@/lib/monitoring/heartbeat', () => ({
  startCronHeartbeat: vi.fn(),
  finishCronHeartbeat: vi.fn(),
  recordQueueSnapshot: vi.fn(),
  recordAlertEvent: vi.fn()
}));

vi.mock('@/lib/email/mailer', () => ({
  sendAlertEmail: vi.fn()
}));

vi.mock('@/lib/alerts/sms', () => ({
  sendAlertSms: vi.fn()
}));

const startCronHeartbeatMock = vi.mocked(startCronHeartbeat);
const finishCronHeartbeatMock = vi.mocked(finishCronHeartbeat);
const recordQueueSnapshotMock = vi.mocked(recordQueueSnapshot);
const recordAlertEventMock = vi.mocked(recordAlertEvent);
const sendAlertEmailMock = vi.mocked(sendAlertEmail);
const sendAlertSmsMock = vi.mocked(sendAlertSms);

function primeEnv() {
  process.env.QUEUE_BACKLOG_ALERT_THRESHOLD = '5';
  process.env.QUEUE_FAILURE_ALERT_THRESHOLD = '2';
  process.env.ALERT_EMAIL = 'alerts@test.dev';
  process.env.SMS_WEBHOOK_URL = 'http://localhost:8080/sms';
  process.env.SMS_RECIPIENTS = '+989121234567';
  process.env.SMS_WEBHOOK_TOKEN = 'token';
  resetEnvCache();
}

beforeEach(() => {
  const startedAt = new Date('2024-01-01T00:00:00Z');
  startCronHeartbeatMock.mockResolvedValue({ id: 'heartbeat-1', startedAt });
  finishCronHeartbeatMock.mockResolvedValue(undefined);
  recordQueueSnapshotMock.mockResolvedValue(undefined);
  recordAlertEventMock.mockResolvedValue(undefined);
  sendAlertEmailMock.mockResolvedValue(undefined);
  sendAlertSmsMock.mockResolvedValue(undefined);
  primeEnv();
});

describe('collectQueueHealth', () => {
  it('records queue state without raising alerts when below thresholds', async () => {
    vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([
      { name: 'vista.ingest', waiting: 2, active: 1, completed: 10, failed: 0 }
    ]);

    await collectQueueHealth();

    expect(recordQueueSnapshotMock).toHaveBeenCalledWith({
      queue: 'vista.ingest',
      waiting: 2,
      active: 1,
      completed: 10,
      failed: 0
    });

    expect(recordAlertEventMock).not.toHaveBeenCalled();
    expect(sendAlertEmailMock).not.toHaveBeenCalled();
    expect(sendAlertSmsMock).not.toHaveBeenCalled();
    expect(finishCronHeartbeatMock).toHaveBeenCalledWith(
      'heartbeat-1',
      'success',
      expect.objectContaining({ startedAt: new Date('2024-01-01T00:00:00Z') })
    );
  });

  it('sends alerts when backlog or failures exceed thresholds', async () => {
    vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([
      { name: 'vista.ingest', waiting: 12, active: 2, completed: 18, failed: 3 }
    ]);

    await collectQueueHealth();

    expect(recordQueueSnapshotMock).toHaveBeenCalledWith({
      queue: 'vista.ingest',
      waiting: 12,
      active: 2,
      completed: 18,
      failed: 3
    });

    expect(recordAlertEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'system',
        severity: 'critical',
        subject: expect.stringContaining('vista.ingest')
      })
    );

    expect(sendAlertEmailMock).toHaveBeenCalledWith({
      subject: expect.stringContaining('vista.ingest'),
      html: expect.stringContaining('vista.ingest')
    });

    expect(sendAlertSmsMock).toHaveBeenCalledWith({
      subject: expect.stringContaining('vista.ingest'),
      message: expect.stringContaining('vista.ingest')
    });
  });

  it('marks heartbeat as error when query fails', async () => {
    vi.spyOn(prisma, '$queryRawUnsafe').mockRejectedValue(new Error('connection lost'));

    await expect(collectQueueHealth()).rejects.toThrow('connection lost');

    expect(finishCronHeartbeatMock).toHaveBeenCalledWith(
      'heartbeat-1',
      'error',
      expect.objectContaining({
        startedAt: new Date('2024-01-01T00:00:00Z'),
        message: 'connection lost'
      })
    );
  });
});
