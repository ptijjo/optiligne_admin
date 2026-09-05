'use client';

import { isApiError } from '@/api/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  kindToRouteType,
  ROUTE_KIND_OPTIONS,
  type RouteKind,
} from '@/features/catalog/kind';
import { useCreateRoute, useStopSearch } from '@/features/editor/hooks';
import type { CreateCalendar, CreateTripTimes, EditorStop, LineString, StopHit } from '@/features/editor/schemas';
import {
  moveVertex,
  pinOrInsertVertex,
  replaceStroke,
  shiftPinnedAfterInsert,
} from '@/features/editor/shape-edit';
import { insertStopAfter, newStopId, removeStop, shapeFromStops } from '@/features/editor/stop-edit';
import { formatDeparture, parseDeparture } from '@/lib/format-departure';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const MapCanvas = dynamic(() => import('./map-canvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-0 w-full" />,
});

type Step = 'meta' | 'stops' | 'days' | 'times' | 'shape';

type Props = {
  operatorCode: string;
  depotCode: string;
};

const emptyShape: LineString = {
  type: 'LineString',
  coordinates: [
    [6.9, 49.1],
    [6.91, 49.12],
  ],
};

const WEEKDAYS: { key: keyof CreateCalendar; label: string }[] = [
  { key: 'monday', label: 'Lun' },
  { key: 'tuesday', label: 'Mar' },
  { key: 'wednesday', label: 'Mer' },
  { key: 'thursday', label: 'Jeu' },
  { key: 'friday', label: 'Ven' },
  { key: 'saturday', label: 'Sam' },
  { key: 'sunday', label: 'Dim' },
];

function defaultCalendar(): CreateCalendar {
  return {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
    startDate: '2026-09-01',
    endDate: '2027-06-30',
  };
}

function defaultTrips(stopCount: number, headsign: string): CreateTripTimes[] {
  const arrivalSecs = Array.from({ length: stopCount }, (_, i) => 7 * 3600 + i * 5 * 60);
  return [{ headsign, arrivalSecs }];
}

function toApiDate(iso: string): string {
  return iso.replaceAll('-', '');
}

export function CreateRouteWizard({ operatorCode, depotCode }: Props) {
  const router = useRouter();
  const create = useCreateRoute(operatorCode, depotCode);
  const [step, setStep] = useState<Step>('meta');
  const [shortName, setShortName] = useState('');
  const [longName, setLongName] = useState('');
  const [routeKind, setRouteKind] = useState<RouteKind>('scolaire');
  const [stops, setStops] = useState<EditorStop[]>([]);
  const [calendar, setCalendar] = useState<CreateCalendar>(defaultCalendar);
  const [trips, setTrips] = useState<CreateTripTimes[]>([]);
  const [shape, setShape] = useState<LineString>(emptyShape);
  const [editShape, setEditShape] = useState(false);
  const [pinned, setPinned] = useState<number[]>([]);
  const [addStopMode, setAddStopMode] = useState(false);
  const [pendingNewStop, setPendingNewStop] = useState<{ lat: number; lng: number } | null>(null);
  const [newStopName, setNewStopName] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const stopSearch = useStopSearch(searchQ);
  const [formError, setFormError] = useState<string | null>(null);

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
      insertStopAfter(prev, null, {
        stopId: newStopId(),
        name,
        lat: pendingNewStop.lat,
        lng: pendingNewStop.lng,
      }),
    );
    resetAddStop();
  };

  const addHit = (hit: StopHit) => {
    if (stops.some((s) => s.stopId === hit.stopId)) {
      toast.error('Cet arrêt est déjà dans le parcours.');
      return;
    }
    setStops((prev) =>
      insertStopAfter(prev, null, {
        stopId: hit.stopId,
        name: hit.name,
        lat: hit.lat,
        lng: hit.lng,
      }),
    );
    setSearchQ('');
  };

  const goStops = () => {
    setFormError(null);
    if (!shortName.trim() || !longName.trim()) {
      setFormError('Indiquez le nom court et le nom long.');
      return;
    }
    setStep('stops');
  };

  const goDays = () => {
    setFormError(null);
    if (stops.length < 2) {
      setFormError('Ajoutez au moins deux arrêts.');
      return;
    }
    setStep('days');
  };

  const goTimes = () => {
    setFormError(null);
    const anyDay =
      calendar.monday ||
      calendar.tuesday ||
      calendar.wednesday ||
      calendar.thursday ||
      calendar.friday ||
      calendar.saturday ||
      calendar.sunday;
    if (!anyDay) {
      setFormError('Cochez au moins un jour de circulation.');
      return;
    }
    if (!calendar.startDate || !calendar.endDate) {
      setFormError('Indiquez la période de validité.');
      return;
    }
    if (toApiDate(calendar.startDate) > toApiDate(calendar.endDate)) {
      setFormError('La date de fin doit être après la date de début.');
      return;
    }
    setTrips((prev) => {
      if (prev.length === 0) {
        return defaultTrips(stops.length, longName.trim());
      }
      return prev.map((tr) => {
        const secs = [...tr.arrivalSecs];
        while (secs.length < stops.length) {
          const last = secs[secs.length - 1] ?? 7 * 3600;
          secs.push(last + 5 * 60);
        }
        return { ...tr, arrivalSecs: secs.slice(0, stops.length) };
      });
    });
    setStep('times');
  };

  const goShape = () => {
    setFormError(null);
    for (const tr of trips) {
      if (tr.arrivalSecs.length !== stops.length) {
        setFormError('Chaque course doit avoir un horaire par arrêt.');
        return;
      }
      for (let i = 1; i < tr.arrivalSecs.length; i += 1) {
        if (tr.arrivalSecs[i] < tr.arrivalSecs[i - 1]) {
          setFormError('Les horaires doivent être croissants le long du parcours.');
          return;
        }
      }
    }
    if (trips.length === 0) {
      setFormError('Ajoutez au moins une course.');
      return;
    }
    const next = shapeFromStops(stops);
    if (next) {
      setShape(next);
    }
    setPinned([]);
    setEditShape(false);
    setStep('shape');
  };

  const setTripTime = (tripIdx: number, stopIdx: number, value: string) => {
    const sec = parseDeparture(value);
    if (sec === null) {
      return;
    }
    setTrips((prev) =>
      prev.map((tr, i) => {
        if (i !== tripIdx) {
          return tr;
        }
        const arrivalSecs = [...tr.arrivalSecs];
        arrivalSecs[stopIdx] = sec;
        return { ...tr, arrivalSecs };
      }),
    );
  };

  const submit = async () => {
    setFormError(null);
    const built = shape.coordinates.length >= 2 ? shape : shapeFromStops(stops);
    if (!built || built.coordinates.length < 2) {
      setFormError('Le tracé doit contenir au moins deux points.');
      return;
    }
    try {
      // 1. Créer PostGIS + GTFS (calendrier + courses) via l’API.
      const out = await create.mutateAsync({
        shortName: shortName.trim(),
        longName: longName.trim(),
        routeType: kindToRouteType(routeKind),
        stops,
        shape: built,
        calendar: {
          ...calendar,
          startDate: toApiDate(calendar.startDate),
          endDate: toApiDate(calendar.endDate),
        },
        trips: trips.map((tr) => ({
          headsign: tr.headsign.trim() || longName.trim(),
          arrivalSecs: tr.arrivalSecs,
        })),
      });
      // 2. Message FR + ouvrir l’éditeur.
      toast.success(out.message);
      router.push(`/routes/${encodeURIComponent(out.routeId)}`);
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Création impossible.');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-4">
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:max-h-full lg:w-80 xl:w-96">
        <ol className="flex flex-wrap gap-1 text-xs text-muted-foreground" aria-label="Étapes">
          {(
            [
              ['meta', '1. Nom'],
              ['stops', '2. Arrêts'],
              ['days', '3. Jours'],
              ['times', '4. Horaires'],
              ['shape', '5. Tracé'],
            ] as const
          ).map(([id, label]) => (
            <li
              key={id}
              className={cn(
                'rounded-md px-2 py-1',
                step === id ? 'bg-muted font-medium text-foreground' : '',
              )}
            >
              {label}
            </li>
          ))}
        </ol>

        {formError ? (
          <Alert>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        {step === 'meta' ? (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="short-name">Nom court</Label>
              <Input
                id="short-name"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Ex. 57S999"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="long-name">Nom long</Label>
              <Input
                id="long-name"
                value={longName}
                onChange={(e) => setLongName(e.target.value)}
                placeholder="Ex. Collège / Gare"
                autoComplete="off"
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Type de ligne</legend>
              {ROUTE_KIND_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="route-kind"
                    value={opt.value}
                    checked={routeKind === opt.value}
                    onChange={() => setRouteKind(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </fieldset>
            <Button type="button" size="lg" onClick={goStops}>
              Étape suivante
            </Button>
          </div>
        ) : null}

        {step === 'stops' ? (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
            <p className="text-sm font-medium">Arrêts du parcours ({stops.length})</p>
            <ul className="max-h-40 divide-y divide-border overflow-y-auto text-sm">
              {stops.map((stop) => (
                <li
                  key={`${stop.stopId}:${stop.sequence}`}
                  className="flex items-center justify-between gap-2 py-1.5"
                >
                  <span className="min-w-0 truncate">
                    <span className="mr-1 tabular-nums text-muted-foreground">{stop.sequence}.</span>
                    {stop.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-xs"
                    aria-label={`Retirer ${stop.name}`}
                    onClick={() => {
                      const next = removeStop(stops, stop.stopId);
                      if (next) {
                        setStops(next);
                      } else if (stops.length <= 2) {
                        setStops(stops.filter((s) => s.stopId !== stop.stopId));
                      }
                    }}
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
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
              <Label htmlFor="stop-search">Rechercher un arrêt</Label>
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
                        aria-label={`Ajouter ${hit.name}`}
                        onClick={() => addHit(hit)}
                      >
                        {hit.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="lg" onClick={() => setStep('meta')}>
                Retour
              </Button>
              <Button type="button" size="lg" className="flex-1" onClick={goDays}>
                Étape suivante
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'days' ? (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
            <p className="text-sm font-medium">Jours de circulation</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Jours de la semaine">
              {WEEKDAYS.map(({ key, label }) => (
                <label
                  key={key}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm',
                    calendar[key] ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(calendar[key])}
                    onChange={(e) => setCalendar((c) => ({ ...c, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="cal-start">Début</Label>
                <Input
                  id="cal-start"
                  type="date"
                  value={calendar.startDate}
                  onChange={(e) => setCalendar((c) => ({ ...c, startDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="cal-end">Fin</Label>
                <Input
                  id="cal-end"
                  type="date"
                  value={calendar.endDate}
                  onChange={(e) => setCalendar((c) => ({ ...c, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="lg" onClick={() => setStep('stops')}>
                Retour
              </Button>
              <Button type="button" size="lg" className="flex-1" onClick={goTimes}>
                Étape suivante
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'times' ? (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
            <p className="text-sm font-medium">Horaires des courses</p>
            <p className="text-xs text-muted-foreground">
              Ces courses circulent les jours choisis à l’étape précédente.
            </p>
            {trips.map((tr, tripIdx) => (
              <div key={tripIdx} className="flex flex-col gap-2 rounded-md border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`trip-hs-${tripIdx}`}>Destination (course {tripIdx + 1})</Label>
                  {trips.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setTrips((prev) => prev.filter((_, i) => i !== tripIdx))}
                    >
                      Retirer
                    </Button>
                  ) : null}
                </div>
                <Input
                  id={`trip-hs-${tripIdx}`}
                  value={tr.headsign}
                  onChange={(e) =>
                    setTrips((prev) =>
                      prev.map((t, i) => (i === tripIdx ? { ...t, headsign: e.target.value } : t)),
                    )
                  }
                  placeholder="Ex. Collège"
                />
                <ul className="flex flex-col gap-1.5">
                  {stops.map((stop, stopIdx) => (
                    <li key={`${stop.stopId}:${stop.sequence}`} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {stop.name}
                      </span>
                      <Input
                        type="time"
                        className="h-8 w-[7.5rem]"
                        aria-label={`Horaire ${stop.name} course ${tripIdx + 1}`}
                        value={formatDeparture(tr.arrivalSecs[stopIdx] ?? 0)}
                        onChange={(e) => setTripTime(tripIdx, stopIdx, e.target.value)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() =>
                setTrips((prev) => [
                  ...prev,
                  {
                    headsign: longName.trim(),
                    arrivalSecs: Array.from(
                      { length: stops.length },
                      (_, i) => 16 * 3600 + i * 5 * 60,
                    ),
                  },
                ])
              }
            >
              Ajouter une course
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="lg" onClick={() => setStep('days')}>
                Retour
              </Button>
              <Button type="button" size="lg" className="flex-1" onClick={goShape}>
                Étape suivante
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'shape' ? (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
            <p className="text-sm text-muted-foreground">
              Tracé provisoire reliant les arrêts. Vous pourrez coller aux rues (OSRM) après création
              dans l’éditeur.
            </p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                const next = shapeFromStops(stops);
                if (next) {
                  setShape(next);
                  setPinned([]);
                }
              }}
            >
              Relier les arrêts
            </Button>
            <Button
              type="button"
              variant={editShape ? 'default' : 'outline'}
              size="lg"
              aria-pressed={editShape}
              onClick={() => setEditShape((v) => !v)}
            >
              {editShape ? 'Fin du dessin' : 'Ajuster le tracé'}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="lg" onClick={() => setStep('times')}>
                Retour
              </Button>
              <Button
                type="button"
                size="lg"
                className="flex-1"
                disabled={create.isPending}
                onClick={() => void submit()}
              >
                Créer la ligne
              </Button>
            </div>
          </div>
        ) : null}
      </aside>

      <div className="relative min-h-70 flex-1 overflow-hidden rounded-md border border-border bg-muted/30 sm:min-h-90 lg:min-h-0">
        <MapCanvas
          shape={shape}
          stops={stops}
          waypoints={[]}
          addWaypointMode={false}
          addStopMode={addStopMode && !pendingNewStop && step === 'stops'}
          editShapeMode={editShape && step === 'shape'}
          pickStopsMode={false}
          selectedStopIds={[]}
          pinnedVertexIndices={pinned}
          onStopMove={(stopId, lat, lng) => {
            setStops((prev) =>
              prev.map((s) => (s.stopId === stopId ? { ...s, lat, lng } : s)),
            );
          }}
          onStopPick={() => {}}
          onWaypointAdd={() => {}}
          onMapAddStop={(lat, lng) => {
            setPendingNewStop({ lat, lng });
            setAddStopMode(false);
          }}
          onWaypointMove={() => {}}
          onShapePin={(lat, lng) => {
            const { shape: next, index, inserted } = pinOrInsertVertex(shape, lat, lng);
            setShape(next);
            setPinned((prev) => {
              const shifted = inserted ? shiftPinnedAfterInsert(prev, index) : prev;
              return shifted.includes(index) ? shifted : [...shifted, index];
            });
          }}
          onVertexMove={(index, lat, lng) => {
            setShape(moveVertex(shape, index, lat, lng));
          }}
          onShapeRedraw={(stroke) => {
            setShape(replaceStroke(shape, stroke, pinned));
          }}
        />
      </div>
    </div>
  );
}
