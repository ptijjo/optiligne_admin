import {
  newRouteHref,
  normalizeSector,
  routeEditorHref,
  sectorFromSearch,
  SECTORS,
} from '@/features/catalog/sector';
import { describe, expect, it } from 'vitest';

describe('secteur réseau', () => {
  it('normalise les alias dépôt vers rge / casas / casc / forbus / hombourg-haut', () => {
    expect(normalizeSector('fluo57')).toBe('rge');
    expect(normalizeSector('transavold')).toBe('casas');
    expect(normalizeSector('transchool')).toBe('casas');
    expect(normalizeSector('casc')).toBe('casc');
    expect(normalizeSector('forbus')).toBe('forbus');
    expect(normalizeSector('hombourg-haut')).toBe('hombourg-haut');
    expect(normalizeSector('hombourghaut')).toBe('hombourg-haut');
    expect(normalizeSector('inconnu')).toBe('rge');
  });

  it('expose les 5 filtres métier', () => {
    expect(SECTORS.map((s) => s.code)).toEqual(['rge', 'casas', 'casc', 'forbus', 'hombourg-haut']);
  });

  it('lit le secteur depuis l’URL d’édition', () => {
    expect(sectorFromSearch('casas', 'fluo57')).toBe('casas');
    expect(sectorFromSearch(null, 'fluo57')).toBe('rge');
  });

  it('construit les liens d’édition avec le secteur', () => {
    expect(routeEditorHref('r-sco', 'rge')).toBe('/routes/r-sco?sector=rge');
    expect(newRouteHref('casas')).toBe('/routes/new?sector=casas');
  });
});
