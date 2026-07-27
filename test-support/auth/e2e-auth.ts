import { createRequire } from 'node:module';

const requireFromProject = createRequire(`${process.cwd()}/package.json`);
const { SignJWT } = requireFromProject('jose') as typeof import('jose');

export async function createE2eAccessToken(input: {
  supabaseAuthId: string;
  email: string;
  secret?: string;
}): Promise<string> {
  const secret = input.secret ?? process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET is required to create an E2E access token.');
  }

  return new SignJWT({ email: input.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.supabaseAuthId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}
