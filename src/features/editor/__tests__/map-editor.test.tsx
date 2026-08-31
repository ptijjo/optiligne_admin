import { MapEditor } from '@/features/editor/map-editor';
import { API, http, jsonOk } from '@/test/msw/http';
import { server } from '@/test/msw/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('next/dynamic', () => ({
  default: () =>
    function MapCanvasStub({
      addWaypointMode,
      onWaypointAdd,
    }: {
      addWaypointMode?: boolean;
      onWaypointAdd?: (lat: number, lng: number) => void;
    }) {
      return (
        <div data-testid="map-canvas-stub">
          {addWaypointMode ? (
            <button type="button" onClick={() => onWaypointAdd?.(49.201, 6.927)}>
              Poser le point de passage
            </button>
          ) : null}
        </div>
      );
    },
}));

const draftR1 = {
  routeId: 'R1',
  shortName: '57S012',
  longName: 'Collège',
  tripId: 'T1',
  shapeId: 'S1',
  feedVersion: 'v1',
  shape: { type: 'LineString' as const, coordinates: [[6.9, 49.1], [6.91, 49.12]] },
  stops: [{ stopId: 'ST1', name: 'Mairie', sequence: 1, lat: 49.201, lng: 6.928 }],
};

const draftPair = {
  ...draftR1,
  stops: [
    { stopId: 'ST1', name: 'Mairie', sequence: 1, lat: 49.201, lng: 6.928 },
    { stopId: 'ST2', name: 'École', sequence: 2, lat: 49.11, lng: 6.85 },
  ],
};

const draftR2 = {
  ...draftR1,
  routeId: 'R2',
  tripId: 'T2',
  stops: [{ stopId: 'ST2', name: 'École', sequence: 1, lat: 49.11, lng: 6.85 }],
};

function renderEditor(routeId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MapEditor routeId={routeId} operatorCode="OP-A" depotCode="DEP-1" />
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('MapEditor — brouillon local', () => {
  it('affiche les arrêts du feed dès le chargement, sans copie via effet', async () => {
    server.use(http.get(`${API}/admin/routes/R1`, () => jsonOk(draftR1)));
    renderEditor('R1');

    expect(await screen.findByLabelText('Latitude')).toHaveValue(49.201);
    expect(screen.getByLabelText('Longitude')).toHaveValue(6.928);
    expect(screen.getByText('Version feed : v1')).toBeInTheDocument();
    expect(screen.getAllByText('Mairie').length).toBeGreaterThan(0);
  });

  it('affiche l’horaire d’arrêt de la course (lecture seule)', async () => {
    server.use(http.get(`${API}/admin/routes/R1`, () => jsonOk(draftR1)));
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MapEditor
          routeId="R1"
          operatorCode="OP-A"
          depotCode="DEP-1"
          stopTimes={[
            { stopId: 'ST1', name: 'Mairie', sequence: 1, arrivalSec: 26100, departureSec: 26100 },
          ]}
        />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('07:15')).toBeInTheDocument();
  });

  it('Annuler restaure les coordonnées du serveur après un déplacement local', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${API}/admin/routes/R1`, () => jsonOk(draftR1)));
    renderEditor('R1');

    const lat = await screen.findByLabelText('Latitude');
    await user.clear(lat);
    await user.type(lat, '49.5');
    expect(lat).toHaveValue(49.5);

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByLabelText('Latitude')).toHaveValue(49.201);
  });

  it('réinitialise le brouillon quand on change de ligne', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API}/admin/routes/R1`, () => jsonOk(draftR1)),
      http.get(`${API}/admin/routes/R2`, () => jsonOk(draftR2)),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function Harness({ routeId }: { routeId: string }) {
      return (
        <QueryClientProvider client={client}>
          <MapEditor routeId={routeId} operatorCode="OP-A" depotCode="DEP-1" />
        </QueryClientProvider>
      );
    }

    const { rerender } = render(<Harness routeId="R1" />);
    const lat = await screen.findByLabelText('Latitude');
    await user.clear(lat);
    await user.type(lat, '49.5');

    rerender(<Harness routeId="R2" />);
    expect(await screen.findByLabelText('Latitude')).toHaveValue(49.11);
    expect(screen.getAllByText('École').length).toBeGreaterThan(0);
  });

  it('permet d’activer l’ajustement manuel du tracé', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${API}/admin/routes/R1`, () => jsonOk(draftR1)));
    renderEditor('R1');
    const toggle = await screen.findByRole('button', { name: 'Ajuster le tracé à la main' });
    await user.click(toggle);
    expect(screen.getByText(/Attrapez la ligne bleue/)).toBeInTheDocument();
  });

  it('colle le tracé actuel sur les rues (map matching), sans recalculer A→B', async () => {
    const user = userEvent.setup();
    const drawn = {
      ...draftR1,
      shape: {
        type: 'LineString' as const,
        coordinates: [
          [6.929, 49.2],
          [6.928, 49.201],
          [6.927, 49.2],
          [6.927, 49.196],
        ],
      },
    };
    let posted: { shape?: { coordinates: number[][] } } | undefined;
    server.use(
      http.get(`${API}/admin/routes/R1`, () => jsonOk(drawn)),
      http.post(`${API}/admin/routes/R1/match`, async ({ request }) => {
        posted = (await request.json()) as { shape?: { coordinates: number[][] } };
        return jsonOk({
          shape: {
            type: 'LineString',
            coordinates: [
              [6.927, 49.2],
              [6.927, 49.198],
              [6.926, 49.196],
            ],
          },
        });
      }),
    );
    renderEditor('R1');
    await screen.findByLabelText('Latitude');
    await user.click(screen.getByRole('button', { name: 'Coller aux rues' }));
    await waitFor(() => {
      expect(posted?.shape?.coordinates).toEqual(drawn.shape.coordinates);
    });
  });

  it('pose un point de passage entre deux arrêts choisis puis l’envoie au recalcul', async () => {
    const user = userEvent.setup();
    let posted: { waypoints?: { lat: number; lng: number; afterStopId?: string }[] } | undefined;
    server.use(
      http.get(`${API}/admin/routes/R1`, () => jsonOk(draftPair)),
      http.post(`${API}/admin/routes/R1/recalculate`, async ({ request }) => {
        posted = (await request.json()) as {
          waypoints?: { lat: number; lng: number; afterStopId?: string }[];
        };
        return jsonOk({
          shape: { type: 'LineString', coordinates: [[6.928, 49.201], [6.927, 49.201], [6.85, 49.11]] },
        });
      }),
    );
    renderEditor('R1');
    expect(await screen.findAllByLabelText('Latitude')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Imposer un détour entre 2 arrêts' }));
    await user.selectOptions(screen.getByLabelText('Arrêt de départ'), 'ST1');
    await user.selectOptions(screen.getByLabelText('Arrêt d’arrivée'), 'ST2');
    expect(screen.getByText(/Cliquez sur la rue entre Mairie et École/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Poser le point de passage' }));
    expect(screen.getByText('Point entre Mairie et École')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recalculer avec détours' }));
    await waitFor(() => {
      expect(posted?.waypoints).toEqual([{ lat: 49.201, lng: 6.927, afterStopId: 'ST1' }]);
    });
  });

  it('refuse de recalculer sans détour (ne reconstruit pas le trajet de base)', async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.get(`${API}/admin/routes/R1`, () => jsonOk(draftPair)),
      http.post(`${API}/admin/routes/R1/recalculate`, () => {
        called = true;
        return jsonOk({
          shape: { type: 'LineString', coordinates: [[6.9, 49.1], [6.91, 49.12]] },
        });
      }),
    );
    renderEditor('R1');
    await screen.findAllByLabelText('Latitude');
    await user.click(screen.getByRole('button', { name: 'Recalculer avec détours' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(called).toBe(false);
  });

  it('supprime un arrêt du parcours localement', async () => {
    const user = userEvent.setup();
    const three = {
      ...draftPair,
      stops: [
        ...draftPair.stops,
        { stopId: 'ST3', name: 'Terminus', sequence: 3, lat: 49.13, lng: 6.87 },
      ],
    };
    server.use(http.get(`${API}/admin/routes/R1`, () => jsonOk(three)));
    renderEditor('R1');
    expect(await screen.findAllByLabelText('Latitude')).toHaveLength(3);
    const removes = screen.getAllByRole('button', { name: 'Supprimer du parcours' });
    await user.click(removes[0]);
    expect(screen.getAllByLabelText('Latitude')).toHaveLength(2);
  });

  it('ajoute un arrêt GTFS depuis la recherche', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API}/admin/routes/R1`, () => jsonOk(draftPair)),
      http.get(`${API}/admin/stops`, () =>
        jsonOk([{ stopId: 'ST99', name: 'Nouveau Collège', lat: 49.15, lng: 6.88 }]),
      ),
    );
    renderEditor('R1');
    await screen.findAllByLabelText('Latitude');
    await user.type(screen.getByLabelText('Rechercher un arrêt GTFS'), 'coll');
    await user.click(await screen.findByRole('button', { name: 'Nouveau Collège' }));
    expect(screen.getAllByLabelText('Latitude')).toHaveLength(3);
  });
});
