import { api } from '@/api/client';
import {
  createRouteBodySchema,
  createRouteResponseSchema,
  draftSchema,
  recalcResponseSchema,
  saveResponseSchema,
  stopHitSchema,
  type CreateRouteBody,
  type CreateRouteResponse,
  type Draft,
  type EditorStop,
  type LineString,
  type StopHit,
  type Waypoint,
} from '@/features/editor/schemas';
import { z } from 'zod';

function scope(operatorCode: string, depotCode: string) {
  return { operator_code: operatorCode, depot_code: depotCode };
}

export function getDraft(
  routeId: string,
  operatorCode: string,
  depotCode: string,
  tripId?: string,
): Promise<Draft> {
  return api.get(`/admin/routes/${encodeURIComponent(routeId)}`, draftSchema, {
    query: { ...scope(operatorCode, depotCode), trip_id: tripId },
  });
}

export function searchStops(query: string, limit = 20): Promise<StopHit[]> {
  return api.get('/admin/stops', z.array(stopHitSchema), {
    query: { q: query, limit: String(limit) },
  });
}

export function createRoute(input: CreateRouteBody): Promise<CreateRouteResponse> {
  const body = createRouteBodySchema.parse(input);
  return api.post('/admin/routes', body, createRouteResponseSchema);
}

export function patchStop(
  routeId: string,
  operatorCode: string,
  depotCode: string,
  stopId: string,
  lat: number,
  lng: number,
): Promise<Draft> {
  return api.patch(
    `/admin/routes/${encodeURIComponent(routeId)}/stops`,
    {
      stopId,
      lat,
      lng,
      operatorCode,
      depotCode,
    },
    draftSchema,
  );
}

export function patchRouteType(
  routeId: string,
  operatorCode: string,
  depotCode: string,
  routeType: number,
): Promise<Draft> {
  return api.patch(
    `/admin/routes/${encodeURIComponent(routeId)}/type`,
    { routeType, operatorCode, depotCode },
    draftSchema,
  );
}

export function recalculate(
  routeId: string,
  operatorCode: string,
  depotCode: string,
  tripId: string,
  stops: EditorStop[],
  waypoints: Waypoint[],
): Promise<{ shape: LineString }> {
  return api.post(
    `/admin/routes/${encodeURIComponent(routeId)}/recalculate`,
    { operatorCode, depotCode, tripId, stops, waypoints },
    recalcResponseSchema,
  );
}

export function matchShape(
  routeId: string,
  operatorCode: string,
  depotCode: string,
  tripId: string,
  shape: LineString,
): Promise<{ shape: LineString }> {
  return api.post(
    `/admin/routes/${encodeURIComponent(routeId)}/match`,
    { operatorCode, depotCode, tripId, shape },
    recalcResponseSchema,
  );
}

export function saveDraft(
  routeId: string,
  operatorCode: string,
  depotCode: string,
  tripId: string,
  stops: EditorStop[],
  shape: LineString,
): Promise<{ feedVersion: string; message: string }> {
  return api.post(
    `/admin/routes/${encodeURIComponent(routeId)}/save`,
    { operatorCode, depotCode, tripId, stops, shape },
    saveResponseSchema,
    { timeoutMs: 120_000 },
  );
}
