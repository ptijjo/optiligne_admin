import { z } from 'zod';

export const errorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

export function envelopeSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    data: dataSchema.optional(),
    error: errorBodySchema.optional(),
  });
}
