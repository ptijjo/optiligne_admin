import { envelopeSchema } from '@/api/envelope';
import { ApiError } from '@/api/errors';
import { getAccessToken, setAccessToken } from '@/auth/session';
import { resolveApiBaseUrl } from '@/lib/api-base-url';
import { z } from 'zod';

const TIMEOUT_MS = 20_000;

export type HttpOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

function withQuery(path: string, query?: Record<string, string | undefined>): string {
  if (!query) {
    return path;
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      setAccessToken(null);
      return false;
    }
    const json: unknown = await res.json().catch(() => null);
    const parsed = envelopeSchema(z.object({ accessToken: z.string() })).safeParse(json);
    if (!parsed.success || !parsed.data.data?.accessToken) {
      setAccessToken(null);
      return false;
    }
    setAccessToken(parsed.data.data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export async function send<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  options: HttpOptions = {},
): Promise<T> {
  const apiUrl = resolveApiBaseUrl();
  const url = `${apiUrl}${withQuery(path, options.query)}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = getAccessToken();
  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort());
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new ApiError(0, 'timeout', 'La requête a expiré.');
    }
    throw new ApiError(0, 'network', 'Impossible de joindre le serveur.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 401 && !options.skipRefresh && !options.skipAuth) {
    const ok = await tryRefresh();
    if (ok) {
      return send(path, dataSchema, { ...options, skipRefresh: true });
    }
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const envelope = envelopeSchema(z.unknown()).safeParse(json);

  if (!res.ok) {
    if (envelope.success && envelope.data.error) {
      throw new ApiError(res.status, envelope.data.error.code, envelope.data.error.message);
    }
    throw new ApiError(res.status, 'internal', 'Une erreur interne est survenue.');
  }

  const parsed = envelopeSchema(dataSchema).safeParse(json);
  if (!parsed.success || parsed.data.data === undefined) {
    throw new ApiError(
      res.status,
      'invalid_response',
      'Réponse API inattendue (données incomplètes). Rechargez la page ou choisissez une autre course.',
    );
  }

  return parsed.data.data;
}
