import { paginate } from '@/features/catalog/paginate';
import { describe, expect, it } from 'vitest';

describe('paginate', () => {
  it('découpe une liste et borne la page', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(paginate(items, 1, 2).items).toEqual(['a', 'b']);
    expect(paginate(items, 3, 2).items).toEqual(['e']);
    expect(paginate(items, 3, 2).pageCount).toBe(3);
    expect(paginate(items, 99, 2).page).toBe(3);
    expect(paginate(items, 0, 2).page).toBe(1);
  });
});
