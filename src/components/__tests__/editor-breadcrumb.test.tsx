import { EditorBreadcrumb } from '@/components/editor-breadcrumb';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('EditorBreadcrumb', () => {
  it('expose le fil d’Ariane et le retour catalogue', () => {
    render(<EditorBreadcrumb sector="rge" shortName="57S012" />);
    const nav = screen.getByRole('navigation', { name: 'Fil d’Ariane' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lignes' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'RGE' })).toHaveAttribute('href', '/?sector=rge');
    expect(screen.getByText('57S012')).toBeInTheDocument();
  });
});
