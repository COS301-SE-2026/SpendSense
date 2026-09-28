function requireValue(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required smoke-test configuration: ${name}`);
  }
  return value;
}

async function readJson(response, failureMessage) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(failureMessage);
  }

  if (!response.ok) {
    throw new Error(failureMessage);
  }

  return payload;
}

async function runAuthenticatedSmoke({ env = process.env, fetchImpl = fetch } = {}) {
  const supabaseUrl = requireValue(env, 'SUPABASE_URL').replace(/\/$/, '');
  const supabaseAnonKey = requireValue(env, 'SUPABASE_ANON_KEY');
  const smokeEmail = requireValue(env, 'PROD_SMOKE_EMAIL');
  const smokePassword = requireValue(env, 'PROD_SMOKE_PASSWORD');
  const backendUrl = requireValue(env, 'BACKEND_URL').replace(/\/$/, '');

  const loginResponse = await fetchImpl(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
    },
  );
  const login = await readJson(loginResponse, 'Supabase smoke-account login failed.');

  if (typeof login.access_token !== 'string' || login.access_token.length === 0) {
    throw new Error('Supabase smoke-account login returned no access token.');
  }

  const profileResponse = await fetchImpl(`${backendUrl}/api/v1/users/me`, {
    headers: {
      Authorization: `Bearer ${login.access_token}`,
    },
  });
  const profile = await readJson(
    profileResponse,
    'Authenticated backend smoke request failed.',
  );

  if (!profile?.data?.user?.id) {
    throw new Error('Authenticated backend smoke response has an unexpected shape.');
  }

  console.log('Authenticated production smoke passed.');
}

if (require.main === module) {
  runAuthenticatedSmoke().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Smoke test failed.');
    process.exitCode = 1;
  });
}

module.exports = { runAuthenticatedSmoke };
