'use client';

import { isApiError } from '@/api/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatDeparture } from '@/lib/format-departure';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
    <MapEditorSession key={`${routeId}:${data.tripId}`} data={data} mutations={mutations} stopTimes={stopTimes} />
  );
}

function MapEditorSession({ data, mutations, stopTimes }: SessionProps) {
  const { patch, patchType, recalc, match, save } = mutations;
  const [routeKind, setRouteKind] = useState<RouteKind>(() => classifyRoute(data.routeType));
  const [stops, setStops] = useState<EditorStop[]>(data.stops);
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

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:overflow-hidden">
      <div className="relative h-[min(55dvh,24rem)] shrink-0 overflow-hidden rounded-lg border border-border sm:h-[min(60dvh,28rem)] lg:h-auto lg:min-h-0 lg:flex-1">
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
            resetSegmentPick();
          }}
          onWaypointMove={onWaypointMove}
          onShapePin={onShapePin}
          onVertexMove={onVertexMove}
          onShapeRedraw={onShapeRedraw}
        />
        </div>
      </div>
      <aside className="flex flex-col gap-3 pb-6 lg:min-h-0 lg:overflow-y-auto lg:pb-0" aria-label="Arrêts et actions">
        <div className="flex flex-col gap-2 rounded-md border border-border p-2">
          <p className="text-sm font-medium">
            {data.shortName} — {data.longName}
          </p>
          <div className="flex flex-col gap-1">
            <Label htmlFor="route-kind">Type de ligne</Label>
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
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant={pickSegment ? 'default' : 'outline'}
            size="lg"
            aria-pressed={pickSegment}
            onClick={() => {
              if (pickSegment) {
                resetSegmentPick();
                return;
              }
              setEditShape(false);
              resetAddStop();
              setPickSegment(true);
              setFromStopId('');
              setToStopId('');
              setPlaceOnMap(false);
            }}
          >
            Imposer un détour entre 2 arrêts
          </Button>
          {pickSegment ? (
            <div className="flex flex-col gap-2 rounded-md border border-border p-2">
              <p className="text-xs text-muted-foreground">
                Sur une boucle : choisissez le départ et l’arrivée qui se suivent (ex. Jardins
                Ouvriers → Étang), ou cliquez les deux arrêts sur la carte, puis la rue.
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
                    <option key={stop.stopId} value={stop.stopId}>
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
                    <option key={stop.stopId} value={stop.stopId}>
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
            </div>
          ) : null}
          <Button
            type="button"
            variant={editShape ? 'default' : 'outline'}
            size="lg"
            aria-pressed={editShape}
            onClick={() => {
              setEditShape((v) => !v);
              resetSegmentPick();
            }}
          >
            {editShape ? 'Glissez le tracé le long des rues…' : 'Ajuster le tracé à la main'}
          </Button>
          {editShape ? (
            <p className="text-xs text-muted-foreground">
              Attrapez la ligne bleue, glissez le chemin voulu, puis Coller aux rues — sans
              Recalculer ensuite (sauf si vous avez posé un détour).
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            disabled={match.isPending}
            onClick={async () => {
              try {
                // 1. Envoyer le LineString actuel (geste ou GTFS), pas seulement A→B.
                // 2. L’API appelle OSRM /match (collage OSM), pas /route.
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
          <p className="text-xs text-muted-foreground">
            Colle votre tracé sur les rues OSM, puis Enregistrer. « Recalculer » sert uniquement
            après un détour (point de passage entre 2 arrêts) — sans détour, il ne touche pas à
            votre tracé.
          </p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={recalc.isPending}
            onClick={async () => {
              // Sans détour, OSRM /route reconstruit le trajet A→B « de base » et écrase le dessin.
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
          <Button
            type="button"
            size="lg"
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
            variant="ghost"
            size="lg"
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
        <p className="text-xs text-muted-foreground">Version feed : {data.feedVersion}</p>
        <div className="flex flex-col gap-2 rounded-md border border-border p-2">
          <p className="text-sm font-medium">Arrêts du parcours</p>
          <div className="flex flex-col gap-1">
            <Label htmlFor="insert-after">Insérer après</Label>
            <select
              id="insert-after"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
              value={insertAfterId}
              onChange={(e) => setInsertAfterId(e.target.value)}
            >
              <option value="">En fin de parcours</option>
              {stops.map((stop) => (
                <option key={stop.stopId} value={stop.stopId}>
                  {stop.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant={addStopMode ? 'default' : 'outline'}
            size="lg"
            aria-pressed={addStopMode}
            onClick={() => {
              if (addStopMode) {
                resetAddStop();
                return;
              }
              setEditShape(false);
              resetSegmentPick();
              setAddStopMode(true);
            }}
          >
            {addStopMode ? 'Cliquez sur la carte…' : 'Ajouter un arrêt (carte)'}
          </Button>
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
                <Button type="button" size="lg" onClick={confirmNewStop}>
                  Valider l’arrêt
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={resetAddStop}>
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
              <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
                {stopSearch.data.map((hit) => (
                  <li key={hit.stopId}>
                    <button
                      type="button"
                      className="flex w-full px-2 py-2 text-left text-sm hover:bg-muted"
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
        {waypoints.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">Points de passage (OSRM)</p>
            <ul className="flex flex-col gap-2">
              {waypoints.map((wp, i) => (
                <li key={`wp-list-${i}`} className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
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
          <div>
            <p className="mb-2 text-sm font-medium">Poignées du tracé</p>
            <ul className="flex flex-col gap-2">
              {pinned.map((index) => (
                <li key={`pin-${index}`} className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
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
        <ol className="flex flex-col gap-3">
          {stops.map((stop) => (
            <li key={stop.stopId} className="rounded-md border border-border p-2">
              <p className="text-sm font-medium">{stop.name}</p>
              {stopTimeLabel(stop.stopId, stopTimes) ? (
                <p className="text-xs text-muted-foreground">{stopTimeLabel(stop.stopId, stopTimes)}</p>
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
          ))}
        </ol>
      </aside>
    </div>
  );
}

function stopTimeLabel(stopId: string, stopTimes: CatalogStop[] | undefined): string | null {
  const timed = stopTimes?.find((item) => item.stopId === stopId);
  if (!timed) {
    return null;
  }
  const sec = timed.departureSec || timed.arrivalSec;
  if (!sec) {
    return null;
  }
  return formatDeparture(sec);
}
