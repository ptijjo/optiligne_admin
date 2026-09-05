'use client';

import { isApiError } from '@/api/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  type RouteKind,
} from '@/features/catalog/kind';
import { paginate, ROUTES_PER_PAGE } from '@/features/catalog/paginate';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'reguliere', label: 'Régulières' },
  { id: 'scolaire', label: 'Scolaires' },
  { id: 'associee', label: 'Associées' },
];

function kindDotClass(kind: RouteKind): string {
  switch (kind) {
    case 'scolaire':
      return 'bg-primary';
    case 'reguliere':
      return 'bg-zinc-500';
    case 'associee':
      return 'bg-zinc-400';
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
      <ul className="flex flex-col gap-0 divide-y divide-border" aria-busy="true" aria-label="Chargement des lignes">
        <li><Skeleton className="my-2 h-12 w-full" /></li>
        <li><Skeleton className="my-2 h-12 w-full" /></li>
        <li><Skeleton className="my-2 h-12 w-full" /></li>
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
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Aucune ligne dans ce périmètre. Les affectations viennent de l’import GTFS (transporteur /
          dépôt), pas de tout le réseau Fluo.
        </p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/routes/new">Nouvelle ligne</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="route-search" className="text-xs font-medium text-muted-foreground">
          Rechercher
        </Label>
        <Input
          id="route-search"
          type="search"
          placeholder="Numéro ou destination…"
          value={query}
          className="h-9 bg-card"
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div
        className="-mx-1 flex gap-0 overflow-x-auto border-b border-border px-1"
        role="tablist"
        aria-label="Type de ligne"
      >
        {FILTERS.map((filter) => {
          const active = kind === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
                active
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                setKind(filter.id);
                setPage(1);
              }}
            >
              {filter.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[filter.id]}</span>
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune ligne ne correspond à ce filtre.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {paged.items.map((route) => {
            const routeKind = classifyRoute(route.routeType);
            return (
              <li key={route.id}>
                <Link
                  href={`/routes/${encodeURIComponent(route.id)}`}
                  className="flex min-h-11 items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-mono text-sm font-medium tracking-tight">{route.shortName}</span>
                    <span className="truncate text-xs text-muted-foreground sm:text-sm">{route.longName}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs sm:gap-4 sm:text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className={cn('size-1.5 rounded-full', kindDotClass(routeKind))} aria-hidden />
                      {routeKindLabel(routeKind)}
                    </span>
                    <span className="font-medium text-primary">
                      Corriger<span className="ml-0.5 hidden sm:inline" aria-hidden>
                        →
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {visible.length > ROUTES_PER_PAGE ? (
        <nav className="flex items-center justify-between gap-2" aria-label="Pagination des lignes">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={paged.page <= 1}
            aria-label="Page précédente"
            onClick={() => setPage((p) => p - 1)}
          >
            <span className="sm:hidden">Préc.</span>
            <span className="hidden sm:inline">Page précédente</span>
          </Button>
          <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
            Page {paged.page} sur {paged.pageCount}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={paged.page >= paged.pageCount}
            aria-label="Page suivante"
            onClick={() => setPage((p) => p + 1)}
          >
            <span className="sm:hidden">Suiv.</span>
            <span className="hidden sm:inline">Page suivante</span>
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
