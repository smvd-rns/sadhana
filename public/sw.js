// Service Worker for Push Notifications on Mobile
// This enables notifications even when the app is not open on mobile

self.addEventListener('push', function (event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'New Message';
    const options = {
        body: data.body || 'You have a new message',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'message-notification',
        requireInteraction: false,
        data: {
            url: data.url || '/dashboard/messages'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
