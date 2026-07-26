import { clearToken, getToken } from '../../lib/tokenStore';

export const isE2eMode = import.meta.env.VITE_E2E_MODE === 'true';

if (isE2eMode && import.meta.env.PROD) {
  throw new Error('E2E authentication cannot be enabled in a production build.');
}

export type E2eSession = {
  access_token: string;
};

export function getE2eSession(): E2eSession | null {
  if (!isE2eMode) {
    return null;
  }

  const token = getToken();
  return token ? { access_token: token } : null;
}

export function clearE2eSession(): void {
  if (isE2eMode) {
    clearToken();
  }
}
