import { api } from '@/api/client';
import { getHealth } from '@/api/health';
import { setAccessToken } from '@/auth/session';
import { resetConfig } from '@/config';
import { API, http, jsonError, jsonOk } from '@/test/msw/http';
import { server } from '@/test/msw/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  setAccessToken(null);
});
afterAll(() => {
  server.close();
});
beforeEach(() => {
  resetConfig();
});

describe('client API — contrat optiligne_back', () => {
  it('GET /health lit data.status ok', async () => {
    server.use(http.get(`${API}/health`, () => jsonOk({ status: 'ok' })));
    await expect(getHealth()).resolves.toEqual({ status: 'ok' });
  });

  it('envoie Authorization Bearer quand un access token est en mémoire', async () => {
    setAccessToken('tok-access');
    server.use(
      http.get(`${API}/catalog/routes`, ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer tok-access');
        return jsonOk([]);
      }),
    );
    await expect(api.get('/catalog/routes', z.array(z.unknown()))).resolves.toEqual([]);
  });

  it('propage error.code scope_required', async () => {
    server.use(
      http.get(`${API}/catalog/routes`, () => jsonError(400, 'scope_required', 'Dépôt requis.')),
    );
    await expect(api.get('/catalog/routes', z.unknown())).rejects.toMatchObject({
      status: 400,
      code: 'scope_required',
      message: 'Dépôt requis.',
    });
  });

  it('propage 401 unauthorized', async () => {
    server.use(
      http.get(`${API}/admin/routes/R1`, () =>
        jsonError(401, 'unauthorized', 'Authentification requise.'),
      ),
    );
    await expect(api.get('/admin/routes/R1', z.unknown())).rejects.toMatchObject({
      status: 401,
      code: 'unauthorized',
    });
  });
});
