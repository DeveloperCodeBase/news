import webPush from 'web-push';
import { prisma } from '../db/client';
import { getEnv } from '../env';
import { getSiteUrl } from '../site/url';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const env = getEnv();
  if (!env.WEB_PUSH_VAPID_PUBLIC_KEY || !env.WEB_PUSH_VAPID_PRIVATE_KEY || !env.WEB_PUSH_CONTACT_EMAIL) {
    return false;
  }
  webPush.setVapidDetails(env.WEB_PUSH_CONTACT_EMAIL, env.WEB_PUSH_VAPID_PUBLIC_KEY, env.WEB_PUSH_VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export type PushArticlePayload = {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  locale?: 'fa' | 'en';
};

export async function sendArticlePublishedNotification(article: PushArticlePayload) {
  if (!ensureConfigured()) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) {
    return;
  }

  const siteUrl = getSiteUrl();
  const targetLocale = article.locale ?? 'fa';
  const notificationPayload = {
    title: article.title,
    body: article.excerpt ?? 'انتشار تازه‌ترین خبر از مجله هوش گیت',
    icon: article.coverImageUrl ?? `${siteUrl}/icons/icon-512.png`,
    data: `${siteUrl}/${targetLocale}/news/${article.slug}`
  };

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          JSON.stringify(notificationPayload)
        );
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastNotifiedAt: new Date() }
        });
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'statusCode' in error &&
          ((error as { statusCode?: number }).statusCode === 404 || (error as { statusCode?: number }).statusCode === 410)
        ) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } });
        } else {
          console.warn('Failed to deliver push notification', error);
        }
      }
    })
  );
}
