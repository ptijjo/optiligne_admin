import {
  applySessionCookies,
  clearSessionCookies,
  REFRESH_COOKIE,
  SESSION_COOKIE,
} from '@/auth/cookies';
import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';

describe('cookies BFF', () => {
  it('pose le refresh sous /api/auth et le marqueur de session sous /', () => {
    const res = NextResponse.json({ data: {} });
    applySessionCookies(res, 'refresh-token');
    const refresh = res.cookies.get(REFRESH_COOKIE);
    const session = res.cookies.get(SESSION_COOKIE);
    expect(refresh?.value).toBe('refresh-token');
    expect(session?.value).toBe('1');
    expect(refresh?.path).toBe('/api/auth');
    expect(session?.path).toBe('/');
  });

  it('efface les deux cookies au logout', () => {
    const res = NextResponse.json({ data: { ok: true } });
    applySessionCookies(res, 'refresh-token');
    clearSessionCookies(res);
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBe('');
    expect(res.cookies.get(SESSION_COOKIE)?.value).toBe('');
  });
});
