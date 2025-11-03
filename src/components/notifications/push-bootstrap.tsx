'use client';

import { useEffect } from 'react';

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (error) {
    console.warn('Service worker registration failed', error);
    return null;
  }
}

async function subscribe(registration: ServiceWorkerRegistration, publicKey: string) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }
  const convertedKey = urlBase64ToUint8Array(publicKey);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey
  });
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function saveSubscription(subscription: PushSubscription) {
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
}

type PushBootstrapProps = {
  vapidKey?: string;
};

export default function PushBootstrap({ vapidKey }: PushBootstrapProps) {
  useEffect(() => {
    if (!vapidKey) return;
    if (!('Notification' in window)) return;

    let active = true;

    (async () => {
      const registration = await registerServiceWorker();
      if (!registration || !active) return;
      const subscription = await subscribe(registration, vapidKey);
      if (subscription) {
        await saveSubscription(subscription);
      }
    })();

    return () => {
      active = false;
    };
  }, [vapidKey]);

  return null;
}
