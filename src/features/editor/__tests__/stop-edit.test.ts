import { insertStopAfter, newStopId, removeStop, renumberStops, shapeFromStops } from '@/features/editor/stop-edit';
import type { EditorStop } from '@/features/editor/schemas';
import { describe, expect, it } from 'vitest';

const base: EditorStop[] = [
  { stopId: 'A', name: 'Départ', sequence: 1, lat: 49.1, lng: 6.9 },
  { stopId: 'B', name: 'Milieu', sequence: 2, lat: 49.11, lng: 6.91 },
  { stopId: 'C', name: 'Arrivée', sequence: 3, lat: 49.12, lng: 6.92 },
];

describe('stop-edit', () => {
  it('supprime un arrêt et renumérote', () => {
    const next = removeStop(base, 'B');
    expect(next?.map((s) => s.stopId)).toEqual(['A', 'C']);
    expect(next?.map((s) => s.sequence)).toEqual([1, 2]);
  });

  it('refuse de passer sous 2 arrêts', () => {
    expect(removeStop(base.slice(0, 2), 'A')).toBeNull();
  });

  it('insère après un arrêt choisi', () => {
    const next = insertStopAfter(base, 'A', {
      stopId: 'ol-x',
      name: 'Nouveau',
      lat: 49.105,
      lng: 6.905,
    });
    expect(next.map((s) => s.stopId)).toEqual(['A', 'ol-x', 'B', 'C']);
    expect(next[1].sequence).toBe(2);
  });

  it('ignore un doublon stopId', () => {
    const next = insertStopAfter(base, 'A', {
      stopId: 'B',
      name: 'Milieu',
      lat: 49.11,
      lng: 6.91,
    });
    expect(next).toEqual(base);
  });

  it('génère un id ol-', () => {
    expect(newStopId().startsWith('ol-')).toBe(true);
  });

  it('shapeFromStops relie lng/lat dans l’ordre', () => {
    expect(shapeFromStops(base.slice(0, 2))).toEqual({
      type: 'LineString',
      coordinates: [
        [6.9, 49.1],
        [6.91, 49.11],
      ],
    });
    expect(shapeFromStops(base.slice(0, 1))).toBeNull();
  });

  it('renumberStops', () => {
    expect(renumberStops([{ ...base[0], sequence: 9 }])[0].sequence).toBe(1);
  });
});
