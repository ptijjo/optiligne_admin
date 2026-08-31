import {
  isNearShape,
  moveVertex,
  pinOrInsertVertex,
  removeVertex,
  replaceStroke,
  shiftPinnedAfterInsert,
  shiftPinnedAfterRemove,
  simplifyShape,
} from '@/features/editor/shape-edit';
import type { LineString } from '@/features/editor/schemas';
import { describe, expect, it } from 'vitest';

const line = (): LineString => ({
  type: 'LineString',
  coordinates: [
    [6.9, 49.1],
    [6.92, 49.1],
  ],
});

describe('pinOrInsertVertex', () => {
  it('insère un point cliqué entre deux sommets (ordre lng, lat)', () => {
    const { shape, index, inserted } = pinOrInsertVertex(line(), 49.12, 6.91);
    expect(inserted).toBe(true);
    expect(index).toBe(1);
    expect(shape.coordinates).toHaveLength(3);
    expect(shape.coordinates[1]).toEqual([6.91, 49.12]);
  });

  it('accroche un sommet existant sans dupliquer', () => {
    const { shape, index, inserted } = pinOrInsertVertex(line(), 49.1, 6.9);
    expect(inserted).toBe(false);
    expect(index).toBe(0);
    expect(shape.coordinates).toHaveLength(2);
  });
});

describe('moveVertex / removeVertex', () => {
  it('déplace un sommet WGS84', () => {
    const moved = moveVertex(line(), 1, 49.2, 6.93);
    expect(moved.coordinates[1]).toEqual([6.93, 49.2]);
  });

  it('refuse de retirer les extrémités ou de descendre sous 2 points', () => {
    const three: LineString = {
      type: 'LineString',
      coordinates: [
        [6.9, 49.1],
        [6.91, 49.11],
        [6.92, 49.12],
      ],
    };
    expect(removeVertex(three, 0).coordinates).toHaveLength(3);
    expect(removeVertex(three, 2).coordinates).toHaveLength(3);
    expect(removeVertex(three, 1).coordinates).toHaveLength(2);
  });
});

describe('indices de poignées', () => {
  it('décale les poignées après insertion et suppression', () => {
    expect(shiftPinnedAfterInsert([0, 2], 1)).toEqual([0, 1, 3]);
    expect(shiftPinnedAfterRemove([0, 2, 3], 2)).toEqual([0, 2]);
  });
});

describe('replaceStroke — redessiner un morceau', () => {
  it('remplace le segment Saint-François par le détour Sainte-Théodore', () => {
    const original: LineString = {
      type: 'LineString',
      coordinates: [
        [6.929, 49.202],
        [6.929, 49.2],
        [6.929, 49.198],
        [6.927, 49.196],
      ],
    };
    const detour = [
      [6.929, 49.2],
      [6.928, 49.201],
      [6.927, 49.2],
      [6.927, 49.198],
      [6.927, 49.196],
    ];
    const out = replaceStroke(original, detour);
    expect(out.coordinates.some((pt) => pt[0] === 6.927 && pt[1] === 49.2)).toBe(true);
    expect(out.coordinates[0]).toEqual([6.929, 49.202]);
    expect(out.coordinates.at(-1)).toEqual([6.927, 49.196]);
  });

  it('reconnaît un clic proche du tracé pour démarrer le geste', () => {
    const original: LineString = {
      type: 'LineString',
      coordinates: [
        [6.929, 49.202],
        [6.929, 49.2],
      ],
    };
    expect(isNearShape(original, 49.201, 6.929)).toBe(true);
    expect(isNearShape(original, 49.201, 6.94)).toBe(false);
  });
});

describe('simplifyShape — segments droits après enregistrement', () => {
  it('réduit un geste dentelé sur une rue en une ligne droite', () => {
    const jitter: LineString = {
      type: 'LineString',
      coordinates: [
        [6.927, 49.202],
        [6.92701, 49.201],
        [6.92699, 49.2],
        [6.927, 49.199],
        [6.927, 49.198],
      ],
    };
    const out = simplifyShape(jitter);
    expect(out.coordinates).toHaveLength(2);
    expect(out.coordinates[0]).toEqual([6.927, 49.202]);
    expect(out.coordinates.at(-1)).toEqual([6.927, 49.198]);
  });

  it('conserve le virage du rond-point (pas une corde qui coupe le détour)', () => {
    const detour: LineString = {
      type: 'LineString',
      coordinates: [
        [6.929, 49.2],
        [6.928, 49.201],
        [6.927, 49.2],
        [6.927, 49.196],
      ],
    };
    const out = simplifyShape(detour);
    expect(out.coordinates.some((pt) => pt[0] === 6.928 && pt[1] === 49.201)).toBe(true);
    expect(out.coordinates.length).toBeGreaterThanOrEqual(3);
  });
});
