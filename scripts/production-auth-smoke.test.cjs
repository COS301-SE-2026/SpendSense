const assert = require('node:assert/strict');
const test = require('node:test');
const { runAuthenticatedSmoke } = require('./production-auth-smoke.cjs');

const smokeEnv = {
  SUPABASE_URL: 'https://supabase.example',
  SUPABASE_ANON_KEY: 'public-anon-key',
  PROD_SMOKE_EMAIL: 'smoke@example.com',
  PROD_SMOKE_PASSWORD: 'not-a-real-password',
  BACKEND_URL: 'https://api.example',
};

test('logs in and completes an authenticated profile read without logging secrets', async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (requests.length === 1) {
      return {
        ok: true,
        json: async () => ({ access_token: 'short-lived-token' }),
      };
    }
    return {
      ok: true,
      json: async () => ({ data: { user: { id: 'user-smoke' } } }),
    };
  };

  await runAuthenticatedSmoke({ env: smokeEnv, fetchImpl });

  assert.equal(requests.length, 2);
  assert.equal(
    requests[0].url,
    'https://supabase.example/auth/v1/token?grant_type=password',
  );
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    email: smokeEnv.PROD_SMOKE_EMAIL,
    password: smokeEnv.PROD_SMOKE_PASSWORD,
  });
  assert.equal(requests[1].url, 'https://api.example/api/v1/users/me');
  assert.equal(
    requests[1].options.headers.Authorization,
    'Bearer short-lived-token',
  );
});

test('fails without exposing Supabase login response details', async () => {
  const fetchImpl = async () => ({
    ok: false,
    json: async () => ({ message: 'sensitive provider detail' }),
  });

  await assert.rejects(
    runAuthenticatedSmoke({ env: smokeEnv, fetchImpl }),
    /Supabase smoke-account login failed/,
  );
});
