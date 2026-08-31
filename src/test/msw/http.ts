import { HttpResponse } from '@/test/msw/server';

export { http } from '@/test/msw/server';

export const API = 'http://127.0.0.1:9191';

export function jsonOk(data: unknown, status = 200) {
  return HttpResponse.json({ data }, { status });
}

export function jsonError(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}
