'use client';

import { useTripStops, useTrips } from '@/features/catalog/hooks';
import { TripSchedule } from '@/features/catalog/trip-schedule';
import { MapEditor } from '@/features/editor/map-editor';
import { serviceDate } from '@/lib/service-date';
import { useMemo, useState } from 'react';

type Props = {
  routeId: string;
  operatorCode: string;
  depotCode: string;
};

export function CircuitWorkbench({ routeId, operatorCode, depotCode }: Props) {
  const [date, setDate] = useState(() => serviceDate());
  const [pickedTripId, setPickedTripId] = useState<string | null>(null);
  // 1. Courses du jour (calendrier GTFS).
  const trips = useTrips(routeId, operatorCode, depotCode, date);
  const selectedTripId = useMemo(() => {
    if (!trips.data?.length) {
      return '';
    }
    if (pickedTripId && trips.data.some((trip) => trip.id === pickedTripId)) {
      return pickedTripId;
    }
    return trips.data[0].id;
  }, [pickedTripId, trips.data]);
  // 2. Horaires d'arrêts de la course choisie.
  const stopTimes = useTripStops(selectedTripId, operatorCode, depotCode);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <TripSchedule
        date={date}
        trips={trips.data}
        selectedTripId={selectedTripId}
        isPending={trips.isPending}
        error={trips.error}
        onDateChange={(next) => {
          setDate(next);
          setPickedTripId(null);
        }}
        onSelect={setPickedTripId}
      />
      <MapEditor
        routeId={routeId}
        operatorCode={operatorCode}
        depotCode={depotCode}
        tripId={selectedTripId || undefined}
        stopTimes={stopTimes.data}
      />
    </div>
  );
}
