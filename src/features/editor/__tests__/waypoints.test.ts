import {
  consecutiveAfterStopId,
  nextStopName,
  segmentCaption,
  segmentOptions,
  stopName,
  waypointOnSegment,
} from '@/features/editor/waypoints';
import type { EditorStop } from '@/features/editor/schemas';
import { describe, expect, it } from 'vitest';

const stops: EditorStop[] = [
  { stopId: 'A', name: 'Jardins Ouvriers', sequence: 1, lat: 49.2, lng: 6.93 },
  { stopId: 'B', name: 'Rue De L’Etang', sequence: 2, lat: 49.19, lng: 6.92 },
  { stopId: 'C', name: 'Hêtres', sequence: 3, lat: 49.195, lng: 6.91 },
];

describe('waypointOnSegment', () => {
  it('attache le point à l’arrêt de départ du segment', () => {
    expect(waypointOnSegment(49.201, 6.927, 'A')).toEqual({
      lat: 49.201,
      lng: 6.927,
      afterStopId: 'A',
    });
    expect(segmentCaption(stops[0], stops[1])).toBe('Entre Jardins Ouvriers et Rue De L’Etang');
    expect(stopName(stops, 'A')).toBe('Jardins Ouvriers');
    expect(nextStopName(stops, 'A')).toBe('Rue De L’Etang');
  });

  it('n’accepte que deux arrêts consécutifs sur la course (boucle)', () => {
    expect(consecutiveAfterStopId(stops, 'A', 'B')).toBe('A');
    expect(consecutiveAfterStopId(stops, 'B', 'A')).toBe('A');
    expect(consecutiveAfterStopId(stops, 'A', 'C')).toBeNull();
    expect(segmentOptions(stops)).toEqual([
      { afterStopId: 'A', fromName: 'Jardins Ouvriers', toName: 'Rue De L’Etang' },
      { afterStopId: 'B', fromName: 'Rue De L’Etang', toName: 'Hêtres' },
    ]);
  });
});
