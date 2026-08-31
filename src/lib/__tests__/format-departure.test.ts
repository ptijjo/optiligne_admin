import { formatDeparture } from '@/lib/format-departure';
import { describe, expect, it } from 'vitest';

describe('formatDeparture', () => {
  it('formate les secondes GTFS en HH:MM', () => {
    expect(formatDeparture(0)).toBe('00:00');
    expect(formatDeparture(7 * 3600 + 15 * 60)).toBe('07:15');
    expect(formatDeparture(25 * 3600 + 30 * 60)).toBe('25:30');
  });
});
