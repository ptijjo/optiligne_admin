import { classifyRoute, filterRoutes, routeKindLabel } from '@/features/catalog/kind';
import type { Route } from '@/features/catalog/types';
import { describe, expect, it } from 'vitest';

const routes: Route[] = [
  { id: '1', shortName: '57R004', longName: 'CREUTZWALD / METZ', routeType: 204 },
  { id: '2', shortName: '57ECR00', longName: 'ELVANGE / CREHANGE', routeType: 712 },
  { id: '3', shortName: '57SAV34', longName: 'ADELANGE / ST-AVOLD', routeType: 713 },
];

describe('classifyRoute — types GTFS Fluo', () => {
  it.each([
    [204, 'reguliere'],
    [3, 'reguliere'],
    [712, 'scolaire'],
    [713, 'associee'],
    [0, 'associee'],
  ] as const)('routeType %s → %s', (routeType, kind) => {
    expect(classifyRoute(routeType)).toBe(kind);
  });

  it('libellés français', () => {
    expect(routeKindLabel('reguliere')).toBe('Régulière');
    expect(routeKindLabel('scolaire')).toBe('Scolaire');
    expect(routeKindLabel('associee')).toBe('Associée');
  });
});

describe('filterRoutes — périmètre', () => {
  it('filtre les scolaires sans exposer les régulières', () => {
    const out = filterRoutes(routes, '', 'scolaire');
    expect(out.map((r) => r.shortName)).toEqual(['57ECR00']);
  });

  it('recherche dans le nom court et long', () => {
    const out = filterRoutes(routes, 'creutzwald', 'all');
    expect(out.map((r) => r.shortName)).toEqual(['57R004']);
  });
});
