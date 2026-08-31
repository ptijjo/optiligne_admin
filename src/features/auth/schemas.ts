import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Adresse e-mail invalide.'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  operatorCode: z.string(),
  depotCode: z.string(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().optional(),
  user: userSchema,
});

export type User = z.infer<typeof userSchema>;
