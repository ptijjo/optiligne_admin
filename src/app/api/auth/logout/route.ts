import { clearSessionCookies, REFRESH_COOKIE } from '@/auth/cookies';
import { backendApiUrl } from '@/auth/backend-url';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await fetch(`${backendApiUrl()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  const out = NextResponse.json({ data: { ok: true } });
  clearSessionCookies(out);
  return out;
}
