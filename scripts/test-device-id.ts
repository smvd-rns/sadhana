
// Mock Request
class MockRequest {
    headers: Map<string, string>;
    constructor(ip: string, deviceId: string) {
        this.headers = new Map();
        this.headers.set('x-forwarded-for', ip);
        this.headers.set('x-device-id', deviceId);
        this.headers.set('user-agent', 'TestScript/2.0');
    }
}

async function runTest() {
    // Manually parse .env.local to avoid 'dotenv' dependency
    const fs = require('fs');
    const path = require('path');
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach((line: string) => {
                const parts = line.split('=');
                if (parts.length >= 2 && !line.startsWith('#')) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '');
                    if (key) process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.warn('Could not read .env.local', e);
    }

    const { checkRateLimit } = require('../lib/rate-limit');

    console.log('Testing Device Fingerprinting...');
    const deviceId = 'test-device-' + Date.now();
    const action = 'test_fingerprint_' + Date.now();

    const config = {
        action: action,
        limit: 3, // Low limit for testing
        windowMs: 60 * 1000,
        blockDurationMs: 60 * 1000
    };

    console.log(`Action: ${config.action}, Limit: ${config.limit}, DeviceID: ${deviceId}`);

    // Phase 1: Exhaust limit with IP A
    console.log('\n--- Phase 1: Exhausting limit with IP A ---');
    const ipA = '192.168.1.1';

    for (let i = 1; i <= 4; i++) {
        const mockReq = {
            headers: {
                get: (key: string) => {
                    if (key === 'x-forwarded-for') return ipA;
                    if (key === 'x-device-id') return deviceId;
                    if (key === 'user-agent') return 'TestScript/2.0';
                    return null;
                }
            }
        } as unknown as Request;

        const result = await checkRateLimit(mockReq, null, config);
        console.log(`req ${i} (IP: ${ipA}): Blocked? ${result.blocked} ${result.message || ''}`);
    }

    // Phase 2: Try with IP B (Simulating VPN)
    console.log('\n--- Phase 2: Trying with IP B (VPN Simulation) ---');
    const ipB = '10.0.0.1'; // Different IP
    const mockReqVPN = {
        headers: {
            get: (key: string) => {
                if (key === 'x-forwarded-for') return ipB; // CHANGED IP
                if (key === 'x-device-id') return deviceId; // SAME DEVICE ID
                if (key === 'user-agent') return 'TestScript/2.0';
                return null;
            }
        }
    } as unknown as Request;

    const vpnResult = await checkRateLimit(mockReqVPN, null, config);
    console.log(`VPN req (IP: ${ipB}): Blocked? ${vpnResult.blocked} ${vpnResult.message || ''}`);

    if (vpnResult.blocked) {
        console.log('\n✅ SUCCESS: Device was blocked despite changing IP (VPN detected).');
    } else {
        console.error('\n❌ FAIL: Device was NOT blocked after changing IP.');
    }
}

runTest().catch(console.error);
