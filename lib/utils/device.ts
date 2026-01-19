import { v4 as uuidv4 } from 'uuid';

/**
 * Retrieves or generates a persistent Device ID.
 * This ID is stored in localStorage and persists across sessions,
 * allowing us to track devices even if IP changes (e.g. VPN).
 */
export const getDeviceId = (): string => {
    if (typeof window === 'undefined') {
        return 'server-side';
    }

    const STORAGE_KEY = 'iskcon_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);

    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem(STORAGE_KEY, deviceId);
    }

    return deviceId;
};

/**
 * Returns headers object with device ID included
 */
export const getDeviceHeaders = (): HeadersInit => {
    const deviceId = getDeviceId();
    return {
        'x-device-id': deviceId,
        'Content-Type': 'application/json'
    };
};
