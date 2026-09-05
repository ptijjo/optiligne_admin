import { createRoute } from '@/features/editor/api';
import { CreateRouteWizard } from '@/features/editor/create-route-wizard';
import { API, http, jsonError, jsonOk } from '@/test/msw/http';
import { server } from '@/test/msw/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MapCanvasStub({
      addStopMode,
      onMapAddStop,
    }: {
      addStopMode?: boolean;
      onMapAddStop?: (lat: number, lng: number) => void;
    }) {
      return (
        <div data-testid="map-canvas-stub">
          {addStopMode ? (
            <button type="button" onClick={() => onMapAddStop?.(49.105, 6.902)}>
              Poser un arrêt
            </button>
          ) : null}
        </div>
      );
    },
}));

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
});
afterAll(() => {
  server.close();
});

function renderWizard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CreateRouteWizard operatorCode="OP-A" depotCode="DEP-1" />
    </QueryClientProvider>,
  );
}

const calendar = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
  startDate: '20260901',
  endDate: '20270630',
};

async function fillThroughStops(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nom court'), '57S999');
  await user.type(screen.getByLabelText('Nom long'), 'Collège / Gare');
  await user.click(screen.getByRole('radio', { name: 'Scolaire' }));
  await user.click(screen.getByRole('button', { name: 'Étape suivante' }));

  await user.type(screen.getByLabelText('Rechercher un arrêt'), 'Mai');
  expect(await screen.findByRole('button', { name: /Ajouter Mairie/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Ajouter Mairie/ }));
  await user.clear(screen.getByLabelText('Rechercher un arrêt'));
  await user.type(screen.getByLabelText('Rechercher un arrêt'), 'Éco');
  expect(await screen.findByRole('button', { name: /Ajouter École/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Ajouter École/ }));
  await user.click(screen.getByRole('button', { name: 'Étape suivante' }));
}

describe('createRoute — contrat API', () => {
  it('poste calendrier + horaires et lit le message FR', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/admin/routes`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return jsonOk({
          routeId: 'ol-r-abc',
          tripId: 'ol-t-xyz',
          feedVersion: '2026',
          message: 'Ligne créée. Les téléphones du dépôt la verront au prochain chargement du catalogue.',
        });
      }),
    );
    const out = await createRoute({
      operatorCode: 'OP-A',
      depotCode: 'DEP-1',
      shortName: '57S999',
      longName: 'Nouvelle ligne',
      routeType: 712,
      stops: [
        { stopId: 'A', name: 'Départ', sequence: 1, lat: 49.1, lng: 6.9 },
        { stopId: 'B', name: 'École', sequence: 2, lat: 49.12, lng: 6.91 },
      ],
      shape: { type: 'LineString', coordinates: [[6.9, 49.1], [6.91, 49.12]] },
      calendar,
      trips: [{ headsign: 'École', arrivalSecs: [25200, 25500] }],
    });
    expect(body).toMatchObject({
      operatorCode: 'OP-A',
      routeType: 712,
      calendar: { monday: true, startDate: '20260901' },
      trips: [{ headsign: 'École', arrivalSecs: [25200, 25500] }],
    });
    expect(out.routeId).toBe('ol-r-abc');
    expect(out.message).toContain('Ligne créée');
  });
});

describe('CreateRouteWizard', () => {
  it('passe par jours puis horaires, crée et redirige', async () => {
    const user = userEvent.setup();
    let posted: Record<string, unknown> | undefined;
    server.use(
      http.get(`${API}/admin/stops`, () =>
        jsonOk([
          { stopId: 'ST1', name: 'Mairie', lat: 49.201, lng: 6.928 },
          { stopId: 'ST2', name: 'École', lat: 49.11, lng: 6.85 },
        ]),
      ),
      http.post(`${API}/admin/routes`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return jsonOk({
          routeId: 'ol-r-new',
          tripId: 'ol-t-new',
          feedVersion: '2026',
          message: 'Ligne créée. Les téléphones du dépôt la verront au prochain chargement du catalogue.',
        });
      }),
    );

    renderWizard();
    await fillThroughStops(user);

    expect(screen.getByText('Jours de circulation')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Étape suivante' }));

    expect(screen.getByText('Horaires des courses')).toBeInTheDocument();
    expect(screen.getByLabelText(/Horaire Mairie/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Étape suivante' }));

    await user.click(screen.getByRole('button', { name: 'Créer la ligne' }));

    await waitFor(() => {
      expect(posted).toBeDefined();
    });
    expect(posted).toMatchObject({
      operatorCode: 'OP-A',
      shortName: '57S999',
      routeType: 712,
    });
    const cal = posted!.calendar as { monday: boolean; startDate: string };
    expect(cal.monday).toBe(true);
    expect(cal.startDate).toBe('20260901');
    const trips = posted!.trips as { arrivalSecs: number[] }[];
    expect(trips.length).toBeGreaterThanOrEqual(1);
    expect(trips[0].arrivalSecs).toHaveLength(2);
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/routes/ol-r-new');
    });
  });

  it('affiche l’erreur API sans rediriger', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API}/admin/stops`, () =>
        jsonOk([
          { stopId: 'ST1', name: 'Mairie', lat: 49.201, lng: 6.928 },
          { stopId: 'ST2', name: 'École', lat: 49.11, lng: 6.85 },
        ]),
      ),
      http.post(`${API}/admin/routes`, () =>
        jsonError(400, 'invalid_calendar', 'Jours de circulation ou période invalides.'),
      ),
    );

    renderWizard();
    await fillThroughStops(user);
    await user.click(screen.getByRole('button', { name: 'Étape suivante' }));
    await user.click(screen.getByRole('button', { name: 'Étape suivante' }));
    await user.click(screen.getByRole('button', { name: 'Créer la ligne' }));

    expect(await screen.findByText('Jours de circulation ou période invalides.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
