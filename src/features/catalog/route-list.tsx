'use client';

import { isApiError } from '@/api/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoutes } from '@/features/catalog/hooks';
import {
  classifyRoute,
  countByKind,
  filterRoutes,
  routeKindLabel,
  type KindFilter,
} from '@/features/catalog/kind';
import { paginate, ROUTES_PER_PAGE } from '@/features/catalog/paginate';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'reguliere', label: 'Régulières' },
  { id: 'scolaire', label: 'Scolaires' },
  { id: 'associee', label: 'Associées' },
];

function badgeVariant(kind: ReturnType<typeof classifyRoute>) {
  switch (kind) {
    case 'scolaire':
      return 'default' as const;
    case 'reguliere':
      return 'secondary' as const;
    case 'associee':
      return 'outline' as const;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function RouteList({ operatorCode, depotCode }: { operatorCode: string; depotCode: string }) {
  const { data, isPending, error } = useRoutes(operatorCode, depotCode);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [page, setPage] = useState(1);

  const counts = useMemo(() => countByKind(data ?? []), [data]);
  const visible = useMemo(() => filterRoutes(data ?? [], query, kind), [data, query, kind]);
  const paged = useMemo(() => paginate(visible, page, ROUTES_PER_PAGE), [visible, page]);

  if (!operatorCode || !depotCode) {
    return (
      <Alert>
        <AlertDescription>Compte sans dépôt. Contactez l’administrateur.</AlertDescription>
      </Alert>
    );
  }
  if (isPending) {
    return (
      <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Chargement des lignes">
        <li><Skeleton className="h-14 w-full" /></li>
        <li><Skeleton className="h-14 w-full" /></li>
        <li><Skeleton className="h-14 w-full" /></li>
      </ul>
    );
  }
  if (error) {
    const message = isApiError(error) ? error.message : 'Impossible de charger les lignes.';
    return (
      <Alert>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    );
  }
  if (!data?.length) {
    return (
      <p className="text-muted-foreground">
        Aucune ligne dans ce périmètre. Les affectations viennent de l’import GTFS (transporteur /
        dépôt), pas de tout le réseau Fluo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="route-search">Rechercher une ligne</Label>
        <Input
          id="route-search"
          type="search"
          placeholder="Numéro ou destination…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Type de ligne">
        {FILTERS.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            size="lg"
            variant={kind === filter.id ? 'default' : 'outline'}
            aria-pressed={kind === filter.id}
            onClick={() => {
              setKind(filter.id);
              setPage(1);
            }}
          >
            {filter.label} ({counts[filter.id]})
          </Button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="text-muted-foreground">Aucune ligne ne correspond à ce filtre.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {paged.items.map((route) => {
            const routeKind = classifyRoute(route.routeType);
            return (
              <li key={route.id}>
                <Link
                  href={`/routes/${encodeURIComponent(route.id)}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium">{route.shortName}</span>
                    <span className="text-sm text-muted-foreground">{route.longName}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={badgeVariant(routeKind)}>{routeKindLabel(routeKind)}</Badge>
                    <span className="text-sm text-primary">Corriger</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {visible.length > ROUTES_PER_PAGE ? (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination des lignes">
          <Button
            type="button"
            variant="outline"
            disabled={paged.page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Page précédente
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {paged.page} sur {paged.pageCount}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={paged.page >= paged.pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Page suivante
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
