'use client';

import { listRoutes, listTripStops, listTrips } from '@/features/catalog/api';
import { useQuery } from '@tanstack/react-query';

export function useRoutes(operatorCode: string, depotCode: string) {
  return useQuery({
    queryKey: ['catalog', 'routes', operatorCode, depotCode],
    queryFn: () => listRoutes(operatorCode, depotCode),
    enabled: Boolean(operatorCode && depotCode),
  });
}

export function useTrips(routeId: string, operatorCode: string, depotCode: string, date: string) {
  return useQuery({
    queryKey: ['catalog', 'trips', routeId, operatorCode, depotCode, date],
    queryFn: () => listTrips(routeId, operatorCode, depotCode, date),
    enabled: Boolean(routeId && operatorCode && depotCode && date),
  });
}

export function useTripStops(tripId: string, operatorCode: string, depotCode: string) {
  return useQuery({
    queryKey: ['catalog', 'trip-stops', tripId, operatorCode, depotCode],
    queryFn: () => listTripStops(tripId, operatorCode, depotCode),
    enabled: Boolean(tripId && operatorCode && depotCode),
  });
}
