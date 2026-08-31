import { envelopeSchema } from '@/api/envelope';
import { applySessionCookies } from '@/auth/cookies';
import { backendApiUrl } from '@/auth/backend-url';
import { loginResponseSchema, loginSchema } from '@/features/auth/schemas';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function POST(request: Request) {
  // 1. Valider e-mail + mot de passe
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'invalid_credentials', message: 'Identifiants invalides.' } },
      { status: 400 },
    );
  }
  // 2. Déléguer à l’API Go
  const res = await fetch(`${backendApiUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(parsed.data),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(json ?? { error: { code: 'invalid_credentials', message: 'Identifiants invalides.' } }, {
      status: res.status,
    });
  }
  const envelope = envelopeSchema(
    loginResponseSchema.extend({ refreshToken: z.string() }),
  ).safeParse(json);
  if (!envelope.success || !envelope.data.data) {
    return NextResponse.json(
      { error: { code: 'internal', message: 'Une erreur interne est survenue.' } },
      { status: 500 },
    );
  }
  // 3. Refresh httpOnly (path /api/auth) + marqueur de session (path /) pour le proxy
  const { refreshToken, ...publicData } = envelope.data.data;
  const out = NextResponse.json({ data: publicData });
  applySessionCookies(out, refreshToken);
  return out;
}
