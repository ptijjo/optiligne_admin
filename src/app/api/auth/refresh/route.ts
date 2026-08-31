import { envelopeSchema } from '@/api/envelope';
import { applySessionCookies, clearSessionCookies, REFRESH_COOKIE } from '@/auth/cookies';
import { backendApiUrl } from '@/auth/backend-url';
import { loginResponseSchema, userSchema } from '@/features/auth/schemas';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function POST() {
  // 1. Lire le refresh httpOnly
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Session expirée.' } },
      { status: 401 },
    );
  }
  // 2. Rotation côté API Go
  const res = await fetch(`${backendApiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const out = NextResponse.json(json ?? { error: { code: 'unauthorized', message: 'Session expirée.' } }, {
      status: res.status,
    });
    clearSessionCookies(out);
    return out;
  }
  const envelope = envelopeSchema(
    loginResponseSchema.extend({ refreshToken: z.string(), user: userSchema.optional() }),
  ).safeParse(json);
  if (!envelope.success || !envelope.data.data) {
    return NextResponse.json(
      { error: { code: 'internal', message: 'Une erreur interne est survenue.' } },
      { status: 500 },
    );
  }
  // 3. Reposer les cookies
  const { refreshToken: nextRefresh, ...publicData } = envelope.data.data;
  const out = NextResponse.json({ data: publicData });
  applySessionCookies(out, nextRefresh);
  return out;
}
