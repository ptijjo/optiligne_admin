import { envelopeSchema } from '@/api/envelope';
import { ApiError } from '@/api/errors';
import { setAccessToken } from '@/auth/session';
import { loginResponseSchema, userSchema, type LoginInput, type User } from '@/features/auth/schemas';
import { z } from 'zod';

const refreshResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().optional(),
  user: userSchema.optional(),
});

export async function loginWithPassword(input: LoginInput): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = envelopeSchema(z.unknown()).safeParse(json);
    if (err.success && err.data.error) {
      throw new ApiError(res.status, err.data.error.code, err.data.error.message);
    }
    throw new ApiError(res.status, 'invalid_credentials', 'Identifiants invalides.');
  }
  const parsed = envelopeSchema(loginResponseSchema).safeParse(json);
  if (!parsed.success || !parsed.data.data) {
    throw new ApiError(res.status, 'internal', 'Une erreur interne est survenue.');
  }
  setAccessToken(parsed.data.data.accessToken);
  return parsed.data.data.user;
}

export async function restoreSession(): Promise<User | null> {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    setAccessToken(null);
    return null;
  }
  const json: unknown = await res.json().catch(() => null);
  const parsed = envelopeSchema(refreshResponseSchema).safeParse(json);
  if (!parsed.success || !parsed.data.data?.accessToken) {
    setAccessToken(null);
    return null;
  }
  setAccessToken(parsed.data.data.accessToken);
  return parsed.data.data.user ?? null;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  setAccessToken(null);
}
