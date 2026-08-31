import { TripSchedule } from '@/features/catalog/trip-schedule';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const trips = [
  { id: 'T-MATIN', headsign: 'COLLÈGE', routeId: 'R1', departureSec: 7 * 3600 + 15 * 60 },
  { id: 'T-SOIR', headsign: 'DÉPÔT', routeId: 'R1', departureSec: 16 * 3600 },
];

describe('TripSchedule', () => {
  it('affiche les horaires et sélectionne une course', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TripSchedule
        date="2026-08-31"
        trips={trips}
        selectedTripId="T-MATIN"
        isPending={false}
        error={null}
        onDateChange={() => undefined}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('07:15')).toBeInTheDocument();
    expect(screen.getByText('16:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DÉPÔT/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /DÉPÔT/ }));
    expect(onSelect).toHaveBeenCalledWith('T-SOIR');
  });

  it('ne fetch pas : message si aucune course', () => {
    render(
      <TripSchedule
        date="2026-08-31"
        trips={[]}
        selectedTripId=""
        isPending={false}
        error={null}
        onDateChange={() => undefined}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText('Aucune course ce jour-là.')).toBeInTheDocument();
  });
});
