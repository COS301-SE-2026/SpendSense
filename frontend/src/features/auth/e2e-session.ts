import { clearToken, getToken } from '../../lib/tokenStore';

export const isE2eMode = import.meta.env.VITE_E2E_MODE === 'true';
const isE2eBuild = import.meta.env.VITE_E2E_BUILD === 'true';

if (isE2eMode && import.meta.env.PROD && !isE2eBuild) {
  throw new Error('E2E authentication cannot be enabled in a production build.');
}

export type E2eSession = {
  access_token: string;
  user: { id: string };
};

function subjectOf(token: string): string {
  try {
    const payload = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return (JSON.parse(atob(payload)) as { sub?: string }).sub ?? '';
  } catch {
    return '';
  }
}

export function getE2eSession(): E2eSession | null {
  if (!isE2eMode) {
    return null;
  }

  const token = getToken();
  return token
    ? { access_token: token, user: { id: subjectOf(token) } }
    : null;
}

export function clearE2eSession(): void {
  if (isE2eMode) {
    clearToken();
  }
}
