import type { EditorStop, Waypoint } from '@/features/editor/schemas';

export type SegmentOption = {
  afterStopId: string;
  fromName: string;
  toName: string;
};

export function waypointOnSegment(lat: number, lng: number, afterStopId: string): Waypoint {
  return { lat, lng, afterStopId };
}

export function stopName(stops: EditorStop[], stopId: string | undefined): string | undefined {
  if (!stopId) {
    return undefined;
  }
  return stops.find((s) => s.stopId === stopId)?.name;
}

export function nextStopName(stops: EditorStop[], afterStopId: string | undefined): string | undefined {
  if (!afterStopId) {
    return undefined;
  }
  const index = stops.findIndex((s) => s.stopId === afterStopId);
  if (index < 0 || index >= stops.length - 1) {
    return undefined;
  }
  return stops[index + 1].name;
}

export function segmentCaption(from: EditorStop, to: EditorStop): string {
  return `Entre ${from.name} et ${to.name}`;
}

/** Tronçons consécutifs de la course (ordre GTFS), pour une boucle précise. */
export function segmentOptions(stops: EditorStop[]): SegmentOption[] {
  const out: SegmentOption[] = [];
  for (let i = 0; i < stops.length - 1; i += 1) {
    out.push({
      afterStopId: stops[i].stopId,
      fromName: stops[i].name,
      toName: stops[i + 1].name,
    });
  }
  return out;
}

/**
 * Si les deux arrêts se suivent sur la course, renvoie l’id du premier (afterStopId OSRM).
 * L’ordre de clic carte n’importe pas.
 */
export function consecutiveAfterStopId(
  stops: EditorStop[],
  stopIdA: string,
  stopIdB: string,
): string | null {
  const i = stops.findIndex((s) => s.stopId === stopIdA);
  const j = stops.findIndex((s) => s.stopId === stopIdB);
  if (i < 0 || j < 0) {
    return null;
  }
  if (j === i + 1) {
    return stops[i].stopId;
  }
  if (i === j + 1) {
    return stops[j].stopId;
  }
  return null;
}
