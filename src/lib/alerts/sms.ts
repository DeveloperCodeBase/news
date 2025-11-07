import { getEnv } from '../env';
import { prisma } from '../db/client';
import { recordAlertEvent } from '../monitoring/heartbeat';

export async function sendAlertSms({
  subject,
  message,
  recipients
}: {
  subject: string;
  message: string;
  recipients?: string[];
}) {
  const env = getEnv();
  if (!env.SMS_WEBHOOK_URL) {
    console.warn('SMS_WEBHOOK_URL is not configured; SMS alert skipped.');
    return;
  }

  const resolvedRecipients = recipients?.length
    ? recipients
    : env.SMS_RECIPIENTS?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];

  if (resolvedRecipients.length === 0) {
    console.warn('No SMS recipients configured; SMS alert skipped.');
    return;
  }

  const payload = {
    subject,
    message,
    to: resolvedRecipients
  };

  let status = 'sent';
  let responseBody: string | undefined;

  try {
    const response = await fetch(env.SMS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${env.SMS_WEBHOOK_TOKEN}` } : {})
      },
      body: JSON.stringify(payload)
    });

    responseBody = await response.text();

    if (!response.ok) {
      status = `failed:${response.status}`;
      console.error('SMS webhook returned error', response.status, responseBody);
    }
  } catch (error) {
    status = 'failed:error';
    responseBody = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send SMS alert', error);
  }

  await prisma.smsNotification.create({
    data: {
      recipients: resolvedRecipients.join(','),
      body: message,
      status,
      response: responseBody
    }
  });

  const severity = status.startsWith('failed') ? 'critical' : 'info';

  await recordAlertEvent({
    channel: 'sms',
    severity,
    subject,
    message,
    metadata: {
      status,
      recipients: resolvedRecipients
    }
  });
}
