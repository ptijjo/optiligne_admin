import { GET } from '@/app/api/upstream/[...path]/route';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/upstream/*', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('relaye vers l’API Go (API_URL)', async () => {
    vi.stubEnv('API_URL', 'http://backend:9191');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { status: 'ok' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const req = new NextRequest('http://localhost:3000/api/upstream/health');
    const res = await GET(req, { params: Promise.resolve({ path: ['health'] }) });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://backend:9191/health' }),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: { status: 'ok' } });
  });
});
