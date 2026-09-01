import { getConfig } from '@/config';

/** URL de base des appels métier (navigateur → proxy Next en prod Docker). */
export function resolveApiBaseUrl(): string {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? 'development';
  if (typeof window !== 'undefined' && appEnv === 'production') {
    return '/api/upstream';
  }
  return getConfig().apiUrl;
}
