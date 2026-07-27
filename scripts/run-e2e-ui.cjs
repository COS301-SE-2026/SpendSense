const { createHmac } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const secret = process.env.E2E_JWT_SECRET ?? 'spendsense-e2e-only-secret';
const now = Math.floor(Date.now() / 1000);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const header = encode({ alg: 'HS256', typ: 'JWT' });
const payload = encode({
  sub: 'e2e-browser-user',
  email: 'e2e-browser@spendsense.test',
  aud: 'authenticated',
  role: 'authenticated',
  iat: now,
  exp: now + 60 * 60,
});
const signature = createHmac('sha256', secret)
  .update(`${header}.${payload}`)
  .digest('base64url');
const token = `${header}.${payload}.${signature}`;

const result = spawnSync(
  'npm',
  ['--prefix', 'frontend', 'run', 'test:e2e'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      E2E_ACCESS_TOKEN: token,
      E2E_API_URL: process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api/v1',
      E2E_BASE_URL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5174',
    },
  },
);

process.exit(result.status ?? 1);
