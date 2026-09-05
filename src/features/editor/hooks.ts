'use client';

import {
  createRoute,
  getDraft,
  matchShape,
  patchRouteType,
  patchStop,
  recalculate,
  saveDraft,
  searchStops,
} from '@/features/editor/api';
import type { CreateRouteBody, EditorStop, LineString, Waypoint } from '@/features/editor/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useDraft(routeId: string, operatorCode: string, depotCode: string, tripId?: string) {
  return useQuery({
    queryKey: ['admin', 'draft', routeId, operatorCode, depotCode, tripId ?? ''],
    queryFn: () => getDraft(routeId, operatorCode, depotCode, tripId),
    enabled: Boolean(routeId && operatorCode && depotCode),
  });
}

export function useStopSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['admin', 'stops', q],
    queryFn: () => searchStops(q),
    enabled: q.length >= 2,
  });
}

export function useCreateRoute(operatorCode: string, depotCode: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateRouteBody, 'operatorCode' | 'depotCode'>) =>
      createRoute({ ...input, operatorCode, depotCode }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['catalog', 'routes', operatorCode, depotCode] });
    },
  });
}

export function useEditorMutations(routeId: string, operatorCode: string, depotCode: string) {
  const client = useQueryClient();
  const invalidate = () => {
    client.invalidateQueries({ queryKey: ['admin', 'draft', routeId, operatorCode, depotCode] });
    client.invalidateQueries({ queryKey: ['catalog', 'routes', operatorCode, depotCode] });
  };

  const patch = useMutation({
    mutationFn: (input: { stopId: string; lat: number; lng: number }) =>
      patchStop(routeId, operatorCode, depotCode, input.stopId, input.lat, input.lng),
    onSuccess: invalidate,
  });

  const patchType = useMutation({
    mutationFn: (routeType: number) => patchRouteType(routeId, operatorCode, depotCode, routeType),
    onSuccess: invalidate,
  });

  const recalc = useMutation({
    mutationFn: (input: { tripId: string; stops: EditorStop[]; waypoints: Waypoint[] }) =>
      recalculate(routeId, operatorCode, depotCode, input.tripId, input.stops, input.waypoints),
  });

  const match = useMutation({
    mutationFn: (input: { tripId: string; shape: LineString }) =>
      matchShape(routeId, operatorCode, depotCode, input.tripId, input.shape),
  });

  const save = useMutation({
    mutationFn: (input: { tripId: string; stops: EditorStop[]; shape: LineString }) =>
      saveDraft(routeId, operatorCode, depotCode, input.tripId, input.stops, input.shape),
    onSuccess: invalidate,
  });

  return { patch, patchType, recalc, match, save };
}
