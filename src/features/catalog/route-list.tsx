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
import { newRouteHref, normalizeSector, routeEditorHref, type SectorCode } from '@/features/catalog/sector';
import { SectorFilter } from '@/features/catalog/sector-filter';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'reguliere', label: 'Régulières' },
  { id: 'scolaire', label: 'Scolaires' },
  { id: 'associee', label: 'Associées' },
];

function kindPillClass(kind: RouteKind): string {
  switch (kind) {
    case 'scolaire':
      return 'bg-[color-mix(in_srgb,var(--route-scolaire)_16%,white)] text-[var(--route-scolaire)] ring-[var(--route-scolaire)]/25';
    case 'reguliere':
      return 'bg-[color-mix(in_srgb,var(--route-reguliere)_14%,white)] text-[var(--route-reguliere)] ring-[var(--route-reguliere)]/25';
    case 'associee':
      return 'bg-[color-mix(in_srgb,var(--route-associee)_14%,white)] text-[var(--route-associee)] ring-[var(--route-associee)]/25';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function kindDotClass(kind: RouteKind): string {
  switch (kind) {
    case 'scolaire':
      return 'bg-[var(--route-scolaire)]';
    case 'reguliere':
      return 'bg-[var(--route-reguliere)]';
    case 'associee':
      return 'bg-[var(--route-associee)]';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

type Props = {
  operatorCode: string;
  depotCode: string;
  sector?: SectorCode;
  onSectorChange?: (sector: SectorCode) => void;
};

export function RouteList({ operatorCode, depotCode, sector: sectorProp, onSectorChange }: Props) {
  const [internalSector, setInternalSector] = useState<SectorCode>(() => normalizeSector(depotCode));
  const sector = sectorProp ?? internalSector;
  const { data, isPending, error } = useRoutes(operatorCode, sector);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [page, setPage] = useState(1);

  const onSector = (next: SectorCode) => {
    setInternalSector(next);
    onSectorChange?.(next);
    setPage(1);
  };

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

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-12 z-20 -mx-1 space-y-3 rounded-xl border border-border/70 bg-card/95 p-3 shadow-sm backdrop-blur-md sm:top-14">
        <SectorFilter value={sector} onChange={onSector} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="route-search" className="text-xs font-medium text-muted-foreground">
            Rechercher
          </Label>
          <Input
            id="route-search"
            type="search"
            placeholder="Numéro ou destination…"
            value={query}
            className="h-10 bg-background"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {!isPending && !error && data && data.length > 0 ? (
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Type de ligne">
            {FILTERS.map((filter) => {
              const active = kind === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-[color,background-color] duration-150 ease-[var(--ease-out)]',
                    active
                      ? 'bg-foreground font-medium text-background'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  onClick={() => {
                    setKind(filter.id);
                    setPage(1);
                  }}
                >
                  {filter.label}
                  <span className={cn('ml-1.5 tabular-nums', active ? 'text-background/70' : 'text-muted-foreground')}>
                    {counts[filter.id]}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {isPending ? (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Chargement des lignes">
          <li><Skeleton className="h-14 w-full rounded-xl" /></li>
          <li><Skeleton className="h-14 w-full rounded-xl" /></li>
          <li><Skeleton className="h-14 w-full rounded-xl" /></li>
        </ul>
      ) : null}
      {error ? (
        <Alert>
          <AlertDescription>
            {isApiError(error) ? error.message : 'Impossible de charger les lignes.'}
          </AlertDescription>
        </Alert>
      ) : null}
      {!isPending && !error && !data?.length ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card/60 p-4">
          <p className="text-sm text-muted-foreground">
            Aucune ligne dans ce réseau. Toutes les lignes GTFS du secteur sont listées, pas seulement
            celles affectées à Transdev.
          </p>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href={newRouteHref(sector)}>Nouvelle ligne</Link>
          </Button>
        </div>
      ) : null}
      {!isPending && !error && data && data.length > 0 ? (
        <>
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune ligne ne correspond à ce filtre.</p>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm divide-y divide-border/70">
              {paged.items.map((route) => {
                const routeKind = classifyRoute(route.routeType);
                return (
                  <li key={route.id}>
                    <Link
                      href={routeEditorHref(route.id, sector)}
                      className="flex min-h-12 items-center justify-between gap-3 px-3 py-3 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-mono text-sm font-semibold tracking-tight">{route.shortName}</span>
                        <span className="truncate text-xs text-muted-foreground sm:text-sm">{route.longName}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-xs sm:gap-4 sm:text-sm">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                            kindPillClass(routeKind),
                          )}
                        >
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
        </>
      ) : null}
    </div>
  );
}
