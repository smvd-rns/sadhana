
// Mock Request
class MockRequest {
    headers: Map<string, string>;
    constructor() {
        this.headers = new Map();
        this.headers.set('x-forwarded-for', '127.0.0.1');
        this.headers.set('user-agent', 'TestScript/1.0');
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

    console.log('Testing Rate Limiting...');

    const req = new MockRequest();
    // Wrap map in a proxy or just use an object that behaves like headers if needed, 
    // but the lib uses request.headers.get which checks header methods.
    // The lib expects standard Request object from next/server which implements standard Fetch API Headers.
    // We'll mock it better.

    const mockReq = {
        headers: {
            get: (key: string) => {
                if (key === 'x-forwarded-for') return '127.0.0.1';
                if (key === 'user-agent') return 'TestScript/1.0';
                return null;
            }
        }
    } as unknown as Request;

    const config = {
        action: 'test_action_' + Date.now(),
        limit: 5,
        windowMs: 60 * 1000,
        blockDurationMs: 60 * 1000
    };

    console.log(`Action: ${config.action}, Limit: ${config.limit}`);

    for (let i = 1; i <= 7; i++) {
        const result = await checkRateLimit(mockReq, 'test-user-id', config);
        console.log(`Attempt ${i}: Blocked? ${result.blocked} ${result.message || ''}`);

        if (i <= 5 && result.blocked) {
            console.error('FAIL: Should not be blocked yet');
        }
        if (i > 5 && !result.blocked) {
            console.error('FAIL: Should be blocked now');
        }
    }
}

runTest().catch(console.error);
