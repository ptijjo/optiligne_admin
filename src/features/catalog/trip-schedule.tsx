'use client';

import { isApiError } from '@/api/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { CatalogTrip } from '@/features/catalog/types';
import { formatDeparture } from '@/lib/format-departure';
import { cn } from '@/lib/utils';

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
    <section
      className="flex shrink-0 flex-col gap-2 rounded-md border border-border bg-card p-2 sm:p-3"
      aria-label="Horaires des courses"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <Label htmlFor="service-date" className="text-xs text-muted-foreground">
            Jour de service
          </Label>
          <Input
            id="service-date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-8 w-full bg-background sm:max-w-44"
          />
        </div>
        <p className="text-xs text-muted-foreground sm:max-w-xl sm:pb-1">
          Lecture seule — le tracé s’applique à toute la ligne.
        </p>
      </div>
      {isPending ? (
        <div className="flex gap-2" aria-busy="true" aria-label="Chargement des horaires">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
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
        <p className="text-sm text-muted-foreground">Aucune course ce jour-là.</p>
      ) : null}
      {!isPending && trips && trips.length > 0 ? (
        <ul className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [-webkit-overflow-scrolling:touch]">
          {trips.map((trip) => {
            const label = `${formatDeparture(trip.departureSec)} ${trip.headsign || 'Course'}`;
            const active = selectedTripId === trip.id;
            return (
              <li key={trip.id} className="shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className={cn('h-8 gap-1.5 px-2.5 text-xs', !active && 'bg-background')}
                  aria-pressed={active}
                  onClick={() => onSelect(trip.id)}
                >
                  <span className="font-mono tabular-nums">{formatDeparture(trip.departureSec)}</span>
                  <span className="max-w-36 truncate font-normal">{trip.headsign || 'Sans destination'}</span>
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
