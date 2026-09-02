'use client';

import { isApiError } from '@/api/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { CatalogTrip } from '@/features/catalog/types';
import { formatDeparture } from '@/lib/format-departure';

type Props = {
  date: string;
  trips: CatalogTrip[] | undefined;
  selectedTripId: string;
  isPending: boolean;
  error: Error | null;
  onDateChange: (date: string) => void;
  onSelect: (tripId: string) => void;
};

export function TripSchedule({
  date,
  trips,
  selectedTripId,
  isPending,
  error,
  onDateChange,
  onSelect,
}: Props) {
  return (
    <section className="flex shrink-0 flex-col gap-2" aria-label="Horaires des courses">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <Label htmlFor="service-date">Jour de service</Label>
          <Input
            id="service-date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full sm:max-w-48"
          />
        </div>
        <p className="pb-1 text-xs text-muted-foreground sm:max-w-xl">
          Lecture seule. Le tracé corrigé s’applique à toute la ligne.
          <span className="hidden sm:inline">
            {' '}
            (tous les jours), pas seulement à la course affichée.
          </span>
        </p>
      </div>
      {isPending ? (
        <div className="flex gap-2" aria-busy="true" aria-label="Chargement des horaires">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      ) : null}
      {error ? (
        <Alert>
          <AlertDescription>
            {isApiError(error) ? error.message : 'Impossible de charger les horaires.'}
          </AlertDescription>
        </Alert>
      ) : null}
      {!isPending && !error && trips?.length === 0 ? (
        <p className="text-muted-foreground">Aucune course ce jour-là.</p>
      ) : null}
      {!isPending && trips && trips.length > 0 ? (
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
          {trips.map((trip) => {
            const label = `${formatDeparture(trip.departureSec)} ${trip.headsign || 'Course'}`;
            return (
              <li key={trip.id} className="shrink-0">
                <Button
                  type="button"
                  variant={selectedTripId === trip.id ? 'default' : 'outline'}
                  aria-pressed={selectedTripId === trip.id}
                  onClick={() => onSelect(trip.id)}
                >
                  <span className="font-mono tabular-nums">{formatDeparture(trip.departureSec)}</span>
                  <span className="max-w-40 truncate font-normal">{trip.headsign || 'Sans destination'}</span>
                </Button>
                <span className="sr-only">{label}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
