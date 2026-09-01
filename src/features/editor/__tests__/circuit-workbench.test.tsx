import { CircuitWorkbench } from '@/components/circuit-workbench';
import { serviceDate } from '@/lib/service-date';
import { API, http, jsonOk } from '@/test/msw/http';
import { server } from '@/test/msw/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('next/dynamic', () => ({
  default: () =>
    function MapCanvasStub() {
      return <div data-testid="map-canvas-stub" />;
    },
}));

const draftMatin = {
  routeId: 'R1',
  shortName: '57S012',
  longName: 'Collège',
  routeType: 712,
  tripId: 'T-MATIN',
  shapeId: 'S1',
  feedVersion: 'v1',
  shape: { type: 'LineString' as const, coordinates: [[6.9, 49.1], [6.91, 49.12]] },
  stops: [{ stopId: 'ST1', name: 'Mairie', sequence: 1, lat: 49.201, lng: 6.928 }],
};

const draftSoir = {
  ...draftMatin,
  tripId: 'T-SOIR',
  stops: [{ stopId: 'ST2', name: 'École', sequence: 1, lat: 49.11, lng: 6.85 }],
};

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('CircuitWorkbench — horaires puis tracé', () => {
  it('choisir une course charge son circuit', async () => {
    const user = userEvent.setup();
    const today = serviceDate();
    const draftIds: string[] = [];
    server.use(
      http.get(`${API}/catalog/routes/R1/trips`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('operator_code')).toBe('OP-A');
        expect(url.searchParams.get('date')).toBe(today);
        return jsonOk([
          { id: 'T-MATIN', headsign: 'COLLÈGE', routeId: 'R1', departureSec: 26100 },
          { id: 'T-SOIR', headsign: 'DÉPÔT', routeId: 'R1', departureSec: 57600 },
        ]);
      }),
      http.get(`${API}/catalog/trips/T-MATIN/stops`, () =>
        jsonOk([{ stopId: 'ST1', name: 'Mairie', sequence: 1, arrivalSec: 26100, departureSec: 26100 }]),
      ),
      http.get(`${API}/catalog/trips/T-SOIR/stops`, () =>
        jsonOk([{ stopId: 'ST2', name: 'École', sequence: 1, arrivalSec: 57600, departureSec: 57600 }]),
      ),
      http.get(`${API}/admin/routes/R1`, ({ request }) => {
        const url = new URL(request.url);
        draftIds.push(url.searchParams.get('trip_id') ?? '');
        const trip = url.searchParams.get('trip_id');
        return jsonOk(trip === 'T-SOIR' ? draftSoir : draftMatin);
      }),
    );

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <CircuitWorkbench routeId="R1" operatorCode="OP-A" depotCode="DEP-1" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('07:15')).toBeInTheDocument();
    expect((await screen.findAllByText('Mairie')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /DÉPÔT/ }));
    expect((await screen.findAllByText('École')).length).toBeGreaterThan(0);
    expect(draftIds).toContain('T-SOIR');
  });
});
