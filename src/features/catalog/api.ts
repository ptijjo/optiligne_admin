import { api } from '@/api/client';
import {
  catalogStopsSchema,
  catalogTripsSchema,
  routesSchema,
  type CatalogStop,
  type CatalogTrip,
  type Route,
} from '@/features/catalog/types';

export function listRoutes(operatorCode: string, depotCode: string): Promise<Route[]> {
  return api.get('/catalog/routes', routesSchema, {
    query: { operator_code: operatorCode, depot_code: depotCode },
  });
}

export function listTrips(
  routeId: string,
  operatorCode: string,
  depotCode: string,
  date: string,
): Promise<CatalogTrip[]> {
  return api.get(`/catalog/routes/${encodeURIComponent(routeId)}/trips`, catalogTripsSchema, {
    query: { operator_code: operatorCode, depot_code: depotCode, date },
  });
}

export function listTripStops(
  tripId: string,
  operatorCode: string,
  depotCode: string,
): Promise<CatalogStop[]> {
  return api.get(`/catalog/trips/${encodeURIComponent(tripId)}/stops`, catalogStopsSchema, {
    query: { operator_code: operatorCode, depot_code: depotCode },
  });
}
