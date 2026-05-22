const fs = require('node:fs');
const path = require('node:path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.env'));

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const email = process.env.SUPABASE_TEST_EMAIL;
  const password = process.env.SUPABASE_TEST_PASSWORD;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.',
    );
    process.exitCode = 1;
    return;
  }

  if (!email || !password) {
    console.error(
      'Missing SUPABASE_TEST_EMAIL or SUPABASE_TEST_PASSWORD in .env.',
    );
    console.error(
      'Add a dedicated test account, then rerun this command.',
    );
    process.exitCode = 1;
    return;
  }

  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    console.error('Supabase login failed.');
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log('\nSupabase Swagger token\n');
  console.log(`Email        ${email}`);
  console.log(`User ID      ${payload.user?.id ?? 'unknown'}`);
  console.log(`Expires in   ${payload.expires_in ?? 'unknown'} seconds`);
  console.log('\nPaste this into Swagger Authorize:\n');
  console.log(payload.access_token);
  console.log('');
}

void main();
