import type { Route } from '@/features/catalog/types';

export const routeKinds = ['reguliere', 'scolaire', 'associee'] as const;

export type RouteKind = (typeof routeKinds)[number];

export type KindFilter = 'all' | RouteKind;

export function classifyRoute(routeType: number): RouteKind {
  switch (routeType) {
    case 3:
    case 204:
      return 'reguliere';
    case 712:
      return 'scolaire';
    case 713:
      return 'associee';
    default:
      return 'associee';
  }
}

export function kindToRouteType(kind: RouteKind): 204 | 712 | 713 {
  switch (kind) {
    case 'reguliere':
      return 204;
    case 'scolaire':
      return 712;
    case 'associee':
      return 713;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export const ROUTE_KIND_OPTIONS: { value: RouteKind; label: string }[] = [
  { value: 'scolaire', label: 'Scolaire' },
  { value: 'associee', label: 'Associée' },
  { value: 'reguliere', label: 'Régulière' },
];

export function routeKindLabel(kind: RouteKind): string {
  switch (kind) {
    case 'reguliere':
      return 'Régulière';
    case 'scolaire':
      return 'Scolaire';
    case 'associee':
      return 'Associée';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function filterRoutes(routes: Route[], query: string, kind: KindFilter): Route[] {
  const needle = query.trim().toLowerCase();
  return routes.filter((route) => {
    if (kind !== 'all' && classifyRoute(route.routeType) !== kind) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return (
      route.shortName.toLowerCase().includes(needle) || route.longName.toLowerCase().includes(needle)
    );
  });
}

export function countByKind(routes: Route[]): Record<KindFilter, number> {
  const counts: Record<KindFilter, number> = {
    all: routes.length,
    reguliere: 0,
    scolaire: 0,
    associee: 0,
  };
  for (const route of routes) {
    counts[classifyRoute(route.routeType)] += 1;
  }
  return counts;
}
