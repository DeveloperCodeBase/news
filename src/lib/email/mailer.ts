import nodemailer from 'nodemailer';
import { getEnv } from '@/lib/env';

let transporterPromise: ReturnType<typeof nodemailer.createTransport> | null = null;

function ensureTransport() {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_FROM) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD
          }
        : undefined
    });
  }

  return transporterPromise;
}

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: EmailPayload) {
  const transport = ensureTransport();
  if (!transport) {
    console.warn('SMTP transport is not configured; email skipped.');
    return;
  }
  const env = getEnv();
  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
    text
  });
}

export async function sendAlertEmail({ subject, html, text }: Omit<EmailPayload, 'to'>) {
  const env = getEnv();
  if (!env.ALERT_EMAIL) {
    console.warn('ALERT_EMAIL is not configured; alert skipped.');
    return;
  }
  await sendEmail({ to: env.ALERT_EMAIL, subject, html, text });
}

export async function sendNewsletterDigest({
  subject,
  html,
  text,
  recipients
}: {
  subject: string;
  html: string;
  text: string;
  recipients?: string[];
}) {
  const env = getEnv();
  const resolvedRecipients = recipients?.length
    ? recipients
    : env.NEWSLETTER_RECIPIENTS?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];

  if (resolvedRecipients.length === 0) {
    console.warn('No newsletter recipients provided; newsletter skipped.');
    return;
  }

  await sendEmail({ to: resolvedRecipients, subject, html, text });
}
