// Register service worker for mobile notifications
export const registerServiceWorker = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
        console.log('Service workers not supported');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
        return true;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
    }
};

// Check if running on mobile device
export const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
};

// Request notification permission with mobile support
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        return false;
    }

    // Register service worker for mobile
    if (isMobileDevice()) {
        await registerServiceWorker();
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

export const showMessageNotification = (
    title: string,
    body: string,
    onClick?: () => void
) => {
    if (Notification.permission !== 'granted') {
        return;
    }

    try {
        const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: 'message-notification',
            requireInteraction: false,
            silent: false,
        });

        notification.onclick = () => {
            window.focus();
            if (onClick) {
                onClick();
            }
            notification.close();
        };

        // Auto close after 10 seconds
        setTimeout(() => {
            notification.close();
        }, 10000);
    } catch (error) {
        console.error('Notification error:', error);
    }
};

export const isNotificationSupported = (): boolean => {
    return 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
    if (!isNotificationSupported()) {
        return 'denied';
    }
    return Notification.permission;
};
