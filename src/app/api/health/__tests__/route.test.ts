import { GET } from '@/app/api/health/route';
import { describe, expect, it } from 'vitest';

describe('GET /api/health', () => {
  it('répond ok pour le healthcheck Docker', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok' });
  });
});
