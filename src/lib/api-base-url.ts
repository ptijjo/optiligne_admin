import { getConfig } from '@/config';

function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** URL de base des appels métier (navigateur → proxy Next hors dev local). */
export function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return getConfig().apiUrl;
  }
  // Évite mixed content (HTTPS → HTTP) et CORS si le build n’a pas NEXT_PUBLIC_APP_ENV=production.
  if (!isLocalDevHost(window.location.hostname)) {
    return '/api/upstream';
  }
  return getConfig().apiUrl;
}
