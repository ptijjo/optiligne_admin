import { resolveApiBaseUrl } from '@/lib/api-base-url';
import { resetConfig } from '@/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolveApiBaseUrl', () => {
  afterEach(() => {
    resetConfig();
    vi.unstubAllEnvs();
  });

  it('utilise le proxy Next en production côté navigateur', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    expect(resolveApiBaseUrl()).toBe('/api/upstream');
  });

  it('appelle l’API directement en développement', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:9191');
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development');
    expect(resolveApiBaseUrl()).toBe('http://127.0.0.1:9191');
  });
});
