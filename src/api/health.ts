import { api } from '@/api/client';
import { z } from 'zod';

export const healthSchema = z.object({
  status: z.string(),
});

export type Health = z.infer<typeof healthSchema>;

export function getHealth(): Promise<Health> {
  return api.get('/health', healthSchema, { skipAuth: true, skipRefresh: true });
}
