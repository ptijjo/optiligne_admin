'use client';

import { isApiError } from '@/api/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useTripStops } from '@/features/catalog/hooks';
import type { CatalogStop } from '@/features/catalog/types';
import {
  classifyRoute,
  kindToRouteType,
  ROUTE_KIND_OPTIONS,
  routeKindLabel,
  type RouteKind,
} from '@/features/catalog/kind';
import { useDraft, useEditorMutations, useStopSearch } from '@/features/editor/hooks';
import type { Draft, EditorStop, LineString, Waypoint } from '@/features/editor/schemas';
import { stopPatchSchema, waypointSchema } from '@/features/editor/schemas';
import {
  moveVertex,
  pinOrInsertVertex,
  removeVertex,
  replaceStroke,
  shiftPinnedAfterInsert,
  shiftPinnedAfterRemove,
} from '@/features/editor/shape-edit';
import { insertStopAfter, newStopId, removeStop } from '@/features/editor/stop-edit';
import { consecutiveAfterStopId, nextStopName, stopName, waypointOnSegment } from '@/features/editor/waypoints';
import { formatDeparture, parseDeparture } from '@/lib/format-departure';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type EditorTool = 'move' | 'detour' | 'draw' | 'addStop';

const MapCanvas = dynamic(() => import('./map-canvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-0 w-full" />,
});

type Props = {
  routeId: string;
  operatorCode: string;
  depotCode: string;
  tripId?: string;
  stopTimes?: CatalogStop[];
};

type SessionProps = {
  data: Draft;
  mutations: ReturnType<typeof useEditorMutations>;
  stopTimes?: CatalogStop[];
};

export function MapEditor({ routeId, operatorCode, depotCode, tripId, stopTimes }: Props) {
  const { data, isPending, error } = useDraft(routeId, operatorCode, depotCode, tripId);
  const mutations = useEditorMutations(routeId, operatorCode, depotCode);

  if (isPending) {
    return <Skeleton className="min-h-0 w-full flex-1" />;
  }
  if (error) {
    return (
      <Alert>
        <AlertDescription>{isApiError(error) ? error.message : 'Impossible de charger le circuit.'}</AlertDescription>
      </Alert>
    );
  }
  if (!data) {
    return null;
  }

  return (
    <MapEditorLoaded
      key={`${routeId}:${data.tripId}`}
      data={data}
      mutations={mutations}
      operatorCode={operatorCode}
      depotCode={depotCode}
      stopTimesProp={stopTimes}
    />
  );
}

function stopTimesFromDraft(data: Draft): CatalogStop[] {
  return data.stops
    .filter((s) => s.arrivalSec !== undefined || s.departureSec !== undefined)
    .map((s) => ({
      stopId: s.stopId,
      name: s.name,
      sequence: s.sequence,
      arrivalSec: s.arrivalSec ?? s.departureSec ?? 0,
      departureSec: s.departureSec ?? s.arrivalSec ?? 0,
    }));
}

function MapEditorLoaded({
  data,
  mutations,
  operatorCode,
  depotCode,
  stopTimesProp,
}: {
  data: Draft;
  mutations: ReturnType<typeof useEditorMutations>;
  operatorCode: string;
  depotCode: string;
  stopTimesProp?: CatalogStop[];
}) {
  // Course du brouillon (même hors calendrier du jour) → horaires toujours disponibles.
  const fromCatalog = useTripStops(data.tripId, operatorCode, depotCode);
  const fromDraft = useMemo(() => stopTimesFromDraft(data), [data]);
  const stopTimes =
    (stopTimesProp && stopTimesProp.length >= 2 ? stopTimesProp : undefined) ??
    (fromCatalog.data && fromCatalog.data.length >= 2 ? fromCatalog.data : undefined) ??
    (fromDraft.length >= 2 ? fromDraft : undefined);

  return <MapEditorSession data={data} mutations={mutations} stopTimes={stopTimes} />;
}

function timesFromCatalog(stopTimes: CatalogStop[] | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of stopTimes ?? []) {
    out[item.stopId] = item.departureSec || item.arrivalSec || 0;
  }
  return out;
}

function MapEditorSession({ data, mutations, stopTimes }: SessionProps) {
  const { patch, patchType, recalc, match, save, patchTimes } = mutations;
  const [routeKind, setRouteKind] = useState<RouteKind>(() => classifyRoute(data.routeType));
  const [stops, setStops] = useState<EditorStop[]>(data.stops);
  const [timeSecs, setTimeSecs] = useState<Record<string, number>>(() => timesFromCatalog(stopTimes));
  // Ne pas écraser une saisie locale si le catalogue arrive après le draft (même course).
  const timesSyncedForTrip = useRef('');
  useEffect(() => {
    if (!stopTimes || stopTimes.length < 2) {
      return;
    }
    if (timesSyncedForTrip.current === data.tripId) {
      return;
    }
    timesSyncedForTrip.current = data.tripId;
    setTimeSecs(timesFromCatalog(stopTimes));
  }, [stopTimes, data.tripId]);
  const canEditTimes = Boolean(stopTimes && stopTimes.length >= 2);
  const saveStopTimes = async () => {
    if (!stopTimes || stopTimes.length < 2) {
      return;
    }
    const ordered = [...stopTimes].sort((a, b) => a.sequence - b.sequence);
    const patches = ordered.map((item) => {
      const sec = timeSecs[item.stopId] ?? item.departureSec ?? item.arrivalSec;
      return {
        stopId: item.stopId,
        sequence: item.sequence,
        arrivalSec: sec,
        departureSec: sec,
      };
    });
    for (let i = 1; i < patches.length; i += 1) {
      if (patches[i].arrivalSec < patches[i - 1].arrivalSec) {
        toast.error('Les horaires doivent être croissants le long du parcours.');
        return;
      }
    }
    try {
      const out = await patchTimes.mutateAsync({ tripId: data.tripId, stops: patches });
      toast.success(out.message);
    } catch (err) {
      toast.error(isApiError(err) ? err.message : 'Impossible d’enregistrer les horaires.');
    }
  };
  const [shape, setShape] = useState<LineString>(data.shape);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [pickSegment, setPickSegment] = useState(false);
  const [fromStopId, setFromStopId] = useState('');
  const [toStopId, setToStopId] = useState('');
  const [placeOnMap, setPlaceOnMap] = useState(false);
  const [editShape, setEditShape] = useState(false);
  const [pinned, setPinned] = useState<number[]>([]);
  const [addStopMode, setAddStopMode] = useState(false);
  const [insertAfterId, setInsertAfterId] = useState('');
  const [pendingNewStop, setPendingNewStop] = useState<{ lat: number; lng: number } | null>(null);
  const [newStopName, setNewStopName] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const stopSearch = useStopSearch(searchQ);

  const afterStopId = useMemo(
    () => (fromStopId && toStopId ? consecutiveAfterStopId(stops, fromStopId, toStopId) : null),
    [fromStopId, toStopId, stops],
  );
  const arrivalChoices = useMemo(() => {
    if (!fromStopId) {
      return stops;
    }
    const i = stops.findIndex((s) => s.stopId === fromStopId);
    if (i < 0) {
      return [];
    }
    const neighbors: EditorStop[] = [];
    if (i > 0) {
      neighbors.push(stops[i - 1]);
    }
    if (i < stops.length - 1) {
      neighbors.push(stops[i + 1]);
    }
    return neighbors;
  }, [fromStopId, stops]);
  const selectedStopIds = [fromStopId, toStopId].filter(Boolean);

  const resetSegmentPick = () => {
    setPickSegment(false);
    setFromStopId('');
    setToStopId('');
    setPlaceOnMap(false);
  };

  const resetAddStop = () => {
    setAddStopMode(false);
    setPendingNewStop(null);
    setNewStopName('');
  };

  const confirmNewStop = () => {
    if (!pendingNewStop) {
      return;
    }
    const name = newStopName.trim();
    if (!name) {
      toast.error('Indiquez un nom pour le nouvel arrêt.');
      return;
    }
    setStops((prev) =>
      insertStopAfter(prev, insertAfterId || null, {
        stopId: newStopId(),
        name,
        lat: pendingNewStop.lat,
        lng: pendingNewStop.lng,
      }),
    );
    resetAddStop();
    toast.success('Arrêt ajouté (non enregistré).');
  };

  const onStopPick = (stopId: string) => {
    if (!pickSegment) {
      return;
    }
    if (!fromStopId || (fromStopId && toStopId)) {
      setFromStopId(stopId);
      setToStopId('');
      setPlaceOnMap(false);
      return;
    }
    if (stopId === fromStopId) {
      return;
    }
    const forced = consecutiveAfterStopId(stops, fromStopId, stopId);
    if (!forced) {
      toast.error('Choisissez deux arrêts qui se suivent sur la course (ex. Jardins Ouvriers puis Étang).');
      return;
    }
    setToStopId(stopId);
    setPlaceOnMap(true);
  };

  const onStopMove = (stopId: string, lat: number, lng: number) => {
    const parsed = stopPatchSchema.safeParse({ stopId, lat, lng });
    if (!parsed.success) {
      toast.error('Coordonnées invalides.');
      return;
    }
    setStops((prev) => prev.map((s) => (s.stopId === stopId ? { ...s, lat, lng } : s)));
  };

  const onShapePin = (lat: number, lng: number) => {
    const parsed = waypointSchema.safeParse({ lat, lng });
    if (!parsed.success) {
      toast.error('Coordonnées invalides.');
      return;
    }
    const result = pinOrInsertVertex(shape, lat, lng);
    setShape(result.shape);
    setPinned((prev) =>
      result.inserted ? shiftPinnedAfterInsert(prev, result.index) : [...new Set([...prev, result.index])],
    );
  };

  const onVertexMove = (index: number, lat: number, lng: number) => {
    const parsed = waypointSchema.safeParse({ lat, lng });
    if (!parsed.success) {
      toast.error('Coordonnées invalides.');
      return;
    }
    setShape((prev) => moveVertex(prev, index, lat, lng));
  };

  const onWaypointMove = (index: number, lat: number, lng: number) => {
    const parsed = waypointSchema.safeParse({ lat, lng });
    if (!parsed.success) {
      toast.error('Coordonnées invalides.');
      return;
    }
    setWaypoints((prev) => prev.map((wp, i) => (i === index ? { ...wp, lat, lng } : wp)));
  };

  const onShapeRedraw = (strokeLngLat: number[][]) => {
    // 1. Remplace le morceau de LineString par le geste (WGS84, pas d’OSRM).
    // 2. Les poignées ne correspondent plus aux sommets : on les retire.
    setShape((prev) => replaceStroke(prev, strokeLngLat));
    setPinned([]);
  };

  const activeTool: EditorTool = addStopMode
    ? 'addStop'
    : editShape
      ? 'draw'
      : pickSegment
        ? 'detour'
        : 'move';

  const setTool = (tool: EditorTool) => {
    if (tool === 'move') {
      setEditShape(false);
      resetSegmentPick();
      resetAddStop();
      return;
    }
    if (tool === 'detour') {
      setEditShape(false);
      resetAddStop();
      setPickSegment(true);
      setFromStopId('');
      setToStopId('');
      setPlaceOnMap(false);
      return;
    }
    if (tool === 'draw') {
      resetSegmentPick();
      resetAddStop();
      setEditShape(true);
      return;
    }
    setEditShape(false);
    resetSegmentPick();
    setAddStopMode(true);
  };

  const tools: { id: EditorTool; label: string }[] = [
    { id: 'move', label: 'Déplacer' },
    { id: 'detour', label: 'Détour' },
    { id: 'draw', label: 'Tracer' },
    { id: 'addStop', label: 'Ajouter' },
  ];

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:overflow-hidden">
      <div className="relative h-[min(55dvh,24rem)] shrink-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm sm:h-[min(60dvh,28rem)] lg:h-auto lg:min-h-0 lg:flex-1">
        <div className="absolute inset-0">
        <MapCanvas
          shape={shape}
          stops={stops}
          waypoints={waypoints}
          addWaypointMode={placeOnMap && Boolean(afterStopId)}
          addStopMode={addStopMode && !pendingNewStop}
          editShapeMode={editShape}
          pickStopsMode={pickSegment && !placeOnMap}
          selectedStopIds={selectedStopIds}
          pinnedVertexIndices={pinned}
          onStopMove={onStopMove}
          onStopPick={onStopPick}
          onMapAddStop={(lat, lng) => {
            setPendingNewStop({ lat, lng });
          }}
          onWaypointAdd={(lat, lng) => {
            if (!afterStopId) {
              toast.error('Choisissez d’abord les deux arrêts du tronçon.');
              return;
            }
            const parsed = waypointSchema.safeParse(waypointOnSegment(lat, lng, afterStopId));
            if (!parsed.success) {
              toast.error('Coordonnées invalides.');
              return;
            }
            setWaypoints((prev) => [...prev, parsed.data]);
            setFromStopId('');
            setToStopId('');
            setPlaceOnMap(false);
          }}
          onWaypointMove={onWaypointMove}
          onShapePin={onShapePin}
          onVertexMove={onVertexMove}
          onShapeRedraw={onShapeRedraw}
        />
        </div>
      </div>
      <aside className="flex flex-col gap-3 pb-6 lg:min-h-0 lg:overflow-y-auto lg:pb-0" aria-label="Arrêts et actions">
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
          <div>
            <p className="font-mono text-sm font-semibold tracking-tight">{data.shortName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{data.longName}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="route-kind" className="text-xs text-muted-foreground">
              Type de ligne
            </Label>
            <select
              id="route-kind"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
              value={routeKind}
              disabled={patchType.isPending}
              onChange={async (e) => {
                const next = e.target.value as RouteKind;
                const previous = routeKind;
                setRouteKind(next);
                try {
                  await patchType.mutateAsync(kindToRouteType(next));
                  toast.success(`Type mis à jour : ${routeKindLabel(next)}.`);
                } catch (err) {
                  // PostGIS peut avoir réussi alors que routes.txt a échoué.
                  if (isApiError(err) && err.code === 'gtfs_file_failed') {
                    toast.error(err.message);
                    return;
                  }
                  setRouteKind(previous);
                  toast.error(isApiError(err) ? err.message : 'Impossible de changer le type.');
                }
              }}
            >
              {ROUTE_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="lg"
              className="h-10"
              disabled={save.isPending}
              onClick={async () => {
                try {
                  // 1. Persister le LineString affiché (après collage OSM si fait).
                  const out = await save.mutateAsync({ tripId: data.tripId, stops, shape });
                  // 2. Confirmation sync GTFS / mobile.
                  setPinned([]);
                  setEditShape(false);
                  resetSegmentPick();
                  toast.success(out.message);
                } catch (err) {
                  toast.error(isApiError(err) ? err.message : 'Enregistrement impossible.');
                }
              }}
            >
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-10"
              onClick={() => {
                setStops(data.stops);
                setShape(data.shape);
                setWaypoints([]);
                setPinned([]);
                setEditShape(false);
                resetSegmentPick();
                resetAddStop();
                setSearchQ('');
                setInsertAfterId('');
              }}
            >
              Annuler
            </Button>
          </div>
          <p className="text-[0.7rem] text-muted-foreground">Version feed : {data.feedVersion}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Outils carte</p>
          <div
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted/70 p-1"
            role="toolbar"
            aria-label="Modes d’édition"
          >
            {tools.map((tool) => {
              const active = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    'rounded-md px-2 py-2 text-xs font-medium transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)]',
                    active
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setTool(active && tool.id !== 'move' ? 'move' : tool.id)}
                >
                  {tool.label}
                </button>
              );
            })}
          </div>
          {activeTool === 'detour' ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/70 p-2.5">
              <p className="text-xs text-muted-foreground">
                Choisissez deux arrêts qui se suivent (liste ou carte), puis cliquez la rue du détour.
              </p>
              <div className="flex flex-col gap-1">
                <Label htmlFor="wp-from">Arrêt de départ</Label>
                <select
                  id="wp-from"
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  value={fromStopId}
                  onChange={(e) => {
                    setFromStopId(e.target.value);
                    setToStopId('');
                    setPlaceOnMap(false);
                  }}
                >
                  <option value="">Choisir…</option>
                  {stops.map((stop) => (
                    <option key={`${stop.stopId}:${stop.sequence}`} value={stop.stopId}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="wp-to">Arrêt d’arrivée</Label>
                <select
                  id="wp-to"
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  value={toStopId}
                  disabled={!fromStopId}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (!next) {
                      setToStopId('');
                      setPlaceOnMap(false);
                      return;
                    }
                    const forced = consecutiveAfterStopId(stops, fromStopId, next);
                    if (!forced) {
                      toast.error('Ces deux arrêts ne se suivent pas sur la course.');
                      return;
                    }
                    setToStopId(next);
                    setPlaceOnMap(true);
                  }}
                >
                  <option value="">Choisir…</option>
                  {arrivalChoices.map((stop) => (
                    <option key={`${stop.stopId}:${stop.sequence}`} value={stop.stopId}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </div>
              {placeOnMap && afterStopId ? (
                <p className="text-xs font-medium text-foreground">
                  Cliquez sur la rue entre {stopName(stops, afterStopId)} et{' '}
                  {nextStopName(stops, afterStopId)} (loin du raccourci).
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-9"
                disabled={recalc.isPending}
                onClick={async () => {
                  if (waypoints.length === 0) {
                    toast.warning('Ajoutez d’abord un détour entre 2 arrêts, sinon votre tracé resterait remplacé par le chemin OSRM de base.');
                    return;
                  }
                  try {
                    const out = await recalc.mutateAsync({ tripId: data.tripId, stops, waypoints });
                    setShape(out.shape);
                    setPinned([]);
                    toast.success('Tracé recalculé avec détours (non enregistré). Pensez à Enregistrer.');
                  } catch (err) {
                    toast.error(isApiError(err) ? err.message : 'Recalcul impossible.');
                  }
                }}
              >
                Recalculer avec détours
              </Button>
            </div>
          ) : null}
          {activeTool === 'draw' ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/70 p-2.5">
              <p className="text-xs text-muted-foreground">
                Glissez le tracé le long des rues, puis collez-le sur OSM.
              </p>
              <Button
                type="button"
                size="lg"
                className="h-9"
                disabled={match.isPending}
                onClick={async () => {
                  try {
                    const out = await match.mutateAsync({ tripId: data.tripId, shape });
                    setShape(out.shape);
                    setPinned([]);
                    toast.success('Tracé collé sur les rues (non enregistré).');
                  } catch (err) {
                    toast.error(isApiError(err) ? err.message : 'Impossible de coller le tracé sur les rues.');
                  }
                }}
              >
                Coller aux rues
              </Button>
            </div>
          ) : null}
          {activeTool === 'addStop' || pendingNewStop ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/70 p-2.5">
              <p className="text-xs text-muted-foreground">
                {pendingNewStop ? 'Nommez le nouvel arrêt.' : 'Cliquez sur la carte pour placer l’arrêt.'}
              </p>
              <div className="flex flex-col gap-1">
                <Label htmlFor="insert-after" className="text-xs text-muted-foreground">
                  Insérer après
                </Label>
                <select
                  id="insert-after"
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  value={insertAfterId}
                  onChange={(e) => setInsertAfterId(e.target.value)}
                >
                  <option value="">En fin de parcours</option>
                  {stops.map((stop) => (
                    <option key={`${stop.stopId}:${stop.sequence}`} value={stop.stopId}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </div>
              {pendingNewStop ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-stop-name">Nom du nouvel arrêt</Label>
                  <Input
                    id="new-stop-name"
                    value={newStopName}
                    onChange={(e) => setNewStopName(e.target.value)}
                    placeholder="Ex. Collège Entrée Sud"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="lg" className="h-9" onClick={confirmNewStop}>
                      Valider l’arrêt
                    </Button>
                    <Button type="button" variant="ghost" size="lg" className="h-9" onClick={resetAddStop}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-col gap-1">
                <Label htmlFor="stop-search">Rechercher un arrêt GTFS</Label>
                <Input
                  id="stop-search"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Nom (min. 2 lettres)"
                />
                {stopSearch.data && stopSearch.data.length > 0 ? (
                  <ul className="max-h-40 overflow-y-auto rounded-lg border border-border">
                    {stopSearch.data.map((hit) => (
                      <li key={hit.stopId}>
                        <button
                          type="button"
                          className="flex w-full px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                          onClick={() => {
                            if (stops.some((s) => s.stopId === hit.stopId)) {
                              toast.error('Cet arrêt est déjà dans le parcours.');
                              return;
                            }
                            setStops((prev) =>
                              insertStopAfter(prev, insertAfterId || null, {
                                stopId: hit.stopId,
                                name: hit.name,
                                lat: hit.lat,
                                lng: hit.lng,
                              }),
                            );
                            setSearchQ('');
                            toast.success('Arrêt ajouté (non enregistré).');
                          }}
                        >
                          {hit.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        {waypoints.length > 0 ? (
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm">
            <p className="mb-2 text-sm font-medium">Points de passage (OSRM)</p>
            <ul className="flex flex-col gap-2">
              {waypoints.map((wp, i) => (
                <li key={`wp-list-${i}`} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">
                    {stopName(stops, wp.afterStopId) && nextStopName(stops, wp.afterStopId)
                      ? `Point entre ${stopName(stops, wp.afterStopId)} et ${nextStopName(stops, wp.afterStopId)}`
                      : `${i + 1}. ${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setWaypoints((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {pinned.length > 0 ? (
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm">
            <p className="mb-2 text-sm font-medium">Poignées du tracé</p>
            <ul className="flex flex-col gap-2">
              {pinned.map((index) => (
                <li key={`pin-${index}`} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">Sommet {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={index === 0 || index === shape.coordinates.length - 1}
                    onClick={() => {
                      setShape((prev) => removeVertex(prev, index));
                      setPinned((prev) => shiftPinnedAfterRemove(prev, index));
                    }}
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Arrêts et horaires</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {canEditTimes
                  ? 'Changez l’heure dans le champ ci-dessous, puis Enregistrer les horaires.'
                  : 'Horaires indisponibles pour cette course (rechargez la page).'}
              </p>
            </div>
            {canEditTimes ? (
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0"
                disabled={patchTimes.isPending}
                onClick={() => void saveStopTimes()}
              >
                Enregistrer les horaires
              </Button>
            ) : null}
          </div>
          <ol className="flex flex-col gap-3">
          {stops.map((stop, stopIndex) => {
            const timed =
              stopTimes?.find((item) => item.stopId === stop.stopId) ??
              stopTimes?.find((item) => item.sequence === stop.sequence) ??
              stopTimes?.[stopIndex];
            const timeKey = timed?.stopId ?? stop.stopId;
            const sec = timed
              ? (timeSecs[timeKey] ?? timed.departureSec ?? timed.arrivalSec)
              : timeSecs[timeKey];
            return (
            <li key={`${stop.stopId}:${stop.sequence}`} className="rounded-lg border border-border/80 bg-background/60 p-2.5">
              <p className="text-sm font-medium">{stop.name}</p>
              {canEditTimes && timed && sec !== undefined ? (
                  <div className="mt-2 flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/5 p-2">
                    <Label htmlFor={`time-${timeKey}`} className="text-xs font-medium text-foreground">
                      Horaire (modifiable)
                    </Label>
                    <Input
                      id={`time-${timeKey}`}
                      type="time"
                      className="h-10 w-full max-w-[12rem] border-input bg-background font-mono text-base"
                      aria-label={`Horaire ${stop.name}`}
                      value={formatDeparture(sec)}
                      onChange={(e) => {
                        const parsed = parseDeparture(e.target.value);
                        if (parsed === null) {
                          return;
                        }
                        setTimeSecs((prev) => ({ ...prev, [timeKey]: parsed }));
                      }}
                    />
                  </div>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`lat-${stop.stopId}`}>Latitude</Label>
                  <Input
                    id={`lat-${stop.stopId}`}
                    type="number"
                    step="0.000001"
                    value={stop.lat}
                    onChange={(e) => onStopMove(stop.stopId, Number(e.target.value), stop.lng)}
                  />
                </div>
                <div>
                  <Label htmlFor={`lng-${stop.stopId}`}>Longitude</Label>
                  <Input
                    id={`lng-${stop.stopId}`}
                    type="number"
                    step="0.000001"
                    value={stop.lng}
                    onChange={(e) => onStopMove(stop.stopId, stop.lat, Number(e.target.value))}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                disabled={patch.isPending}
                onClick={async () => {
                  try {
                    await patch.mutateAsync({ stopId: stop.stopId, lat: stop.lat, lng: stop.lng });
                    toast.success('Arrêt enregistré.');
                  } catch (err) {
                    toast.error(isApiError(err) ? err.message : 'Impossible d’enregistrer l’arrêt.');
                  }
                }}
              >
                Enregistrer cet arrêt
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-1"
                disabled={stops.length <= 2}
                onClick={() => {
                  const next = removeStop(stops, stop.stopId);
                  if (!next) {
                    toast.error('Il faut au moins deux arrêts sur le parcours.');
                    return;
                  }
                  setStops(next);
                  toast.success('Arrêt retiré du parcours (non enregistré).');
                }}
              >
                Supprimer du parcours
              </Button>
            </li>
            );
          })}
          </ol>
        </div>
      </aside>
    </div>
  );
}
