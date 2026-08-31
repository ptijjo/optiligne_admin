import { send, type HttpOptions } from '@/api/http';
import { z } from 'zod';

export type RequestOptions = HttpOptions;

export const api = {
  get: <T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) =>
    send(path, schema, { ...options, method: 'GET' }),
  post: <T>(path: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions) =>
    send(path, schema, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions) =>
    send(path, schema, { ...options, method: 'PATCH', body }),
};
