import { z } from 'zod';

const schema = z.object({
  apiUrl: z.string().url(),
  appEnv: z.enum(['development', 'preview', 'production']),
});

export type AppConfig = z.infer<typeof schema>;

function readConfig(): AppConfig {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL est requise');
  }
  return schema.parse({
    apiUrl: apiUrl.replace(/\/$/, ''),
    appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
  });
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (!cached) {
    cached = readConfig();
  }
  return cached;
}

export function resetConfig() {
  cached = undefined;
}
