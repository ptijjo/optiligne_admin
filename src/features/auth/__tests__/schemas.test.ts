import { loginSchema } from '@/features/auth/schemas';
import { stopPatchSchema } from '@/features/editor/schemas';
import { describe, expect, it } from 'vitest';

describe('schémas Zod', () => {
  it('refuse un e-mail invalide', () => {
    const result = loginSchema.safeParse({ email: 'pas-un-mail', password: 'motdepasse1' });
    expect(result.success).toBe(false);
  });

  it('accepte un login valide', () => {
    const result = loginSchema.safeParse({ email: 'exploitant@optiligne.test', password: 'motdepasse1' });
    expect(result.success).toBe(true);
  });

  it('refuse une latitude hors bornes', () => {
    const result = stopPatchSchema.safeParse({ stopId: 'A', lat: 200, lng: 6.9 });
    expect(result.success).toBe(false);
  });

  it('accepte un déplacement d’arrêt WGS84', () => {
    const result = stopPatchSchema.safeParse({ stopId: 'A', lat: 49.201, lng: 6.928 });
    expect(result.success).toBe(true);
  });
});
