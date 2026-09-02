import { resolveApiBaseUrl } from '@/lib/api-base-url';
import { resetConfig } from '@/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolveApiBaseUrl', () => {
  afterEach(() => {
    resetConfig();
    vi.unstubAllEnvs();
  });

  it('utilise le proxy Next hors localhost (évite mixed content HTTPS→HTTP)', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.interne:9191');
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development');
    vi.stubGlobal('window', {
      location: { hostname: 'optiligne.controle-td.fr', protocol: 'https:' },
    } as Window & typeof globalThis);
    expect(resolveApiBaseUrl()).toBe('/api/upstream');
  });

  it('appelle l’API directement en dev local', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:9191');
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development');
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', protocol: 'http:' },
    } as Window & typeof globalThis);
    expect(resolveApiBaseUrl()).toBe('http://127.0.0.1:9191');
  });
});
