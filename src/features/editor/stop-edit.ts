import type { EditorStop } from '@/features/editor/schemas';

export function renumberStops(stops: EditorStop[]): EditorStop[] {
  return stops.map((stop, i) => ({ ...stop, sequence: i + 1 }));
}

export function removeStop(stops: EditorStop[], stopId: string): EditorStop[] | null {
  if (stops.length <= 2) {
    return null;
  }
  const next = stops.filter((s) => s.stopId !== stopId);
  if (next.length === stops.length || next.length < 2) {
    return null;
  }
  return renumberStops(next);
}

export function insertStopAfter(
  stops: EditorStop[],
  afterStopId: string | null,
  stop: Omit<EditorStop, 'sequence'>,
): EditorStop[] {
  if (stops.some((s) => s.stopId === stop.stopId)) {
    return stops;
  }
  const row: EditorStop = { ...stop, sequence: 0 };
  if (!afterStopId) {
    return renumberStops([...stops, row]);
  }
  const idx = stops.findIndex((s) => s.stopId === afterStopId);
  if (idx < 0) {
    return renumberStops([...stops, row]);
  }
  const next = [...stops.slice(0, idx + 1), row, ...stops.slice(idx + 1)];
  return renumberStops(next);
}

export function newStopId(): string {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `ol-${raw.slice(0, 16)}`;
}
