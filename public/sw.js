self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  const data = event.data.json();
  const title = data.title || 'Vista AI News';
  const options = {
    body: data.body || 'خبر جدید منتشر شد.',
    icon: data.icon,
    data: data.data
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data;
  if (target) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({ type: 'PUSH_CLICK', url: target });
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(target);
        }
        return undefined;
      })
    );
  }
});
