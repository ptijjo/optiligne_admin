import { RouteList } from '@/features/catalog/route-list';
import { API, http, jsonOk } from '@/test/msw/http';
import { server } from '@/test/msw/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

const routesA = [
  { id: 'r-reg', shortName: '57R004', longName: 'CREUTZWALD / METZ', routeType: 204 },
  { id: 'r-sco', shortName: '57ECR00', longName: 'ELVANGE / CREHANGE', routeType: 712 },
  { id: 'r-ass', shortName: '57SAV34', longName: 'ADELANGE / ST-AVOLD', routeType: 713 },
];

const routesB = [
  { id: 'r-b', shortName: 'LIGNE-B', longName: 'Autre transporteur', routeType: 204 },
];

function renderList(operatorCode: string, depotCode: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RouteList operatorCode={operatorCode} depotCode={depotCode} />
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

describe('RouteList — dashboard périmètre', () => {
  it('n’affiche pas les lignes d’un autre transporteur', async () => {
    server.use(
      http.get(`${API}/catalog/routes`, ({ request }) => {
        const url = new URL(request.url);
        const op = url.searchParams.get('operator_code');
        return jsonOk(op === 'OP-A' ? routesA : routesB);
      }),
    );
    renderList('OP-A', 'DEP-1');
    expect(await screen.findByText('57R004')).toBeInTheDocument();
    expect(screen.queryByText('LIGNE-B')).not.toBeInTheDocument();
  });

  it('filtre les scolaires et relie vers l’éditeur', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${API}/catalog/routes`, () => jsonOk(routesA)));
    renderList('OP-A', 'DEP-1');
    expect(await screen.findByText('57R004')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Scolaires/ }));
    expect(screen.getByText('57ECR00')).toBeInTheDocument();
    expect(screen.queryByText('57R004')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /57ECR00/ })).toHaveAttribute(
      'href',
      '/routes/r-sco',
    );
  });

  it('ne fetch pas sans dépôt', () => {
    renderList('', '');
    expect(screen.getByText('Compte sans dépôt. Contactez l’administrateur.')).toBeInTheDocument();
  });

  it('pagine le catalogue : 8 lignes par page', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `r-${i}`,
      shortName: `L${String(i + 1).padStart(2, '0')}`,
      longName: `Destination ${i + 1}`,
      routeType: 712,
    }));
    server.use(http.get(`${API}/catalog/routes`, () => jsonOk(many)));
    renderList('OP-A', 'DEP-1');
    expect(await screen.findByText('L01')).toBeInTheDocument();
    expect(screen.getByText('L08')).toBeInTheDocument();
    expect(screen.queryByText('L09')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 sur 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Page suivante' }));
    expect(screen.getByText('L09')).toBeInTheDocument();
    expect(screen.getByText('L10')).toBeInTheDocument();
    expect(screen.queryByText('L01')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 sur 2')).toBeInTheDocument();
  });
});
