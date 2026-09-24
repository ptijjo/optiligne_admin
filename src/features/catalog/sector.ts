export const sectorCodes = ['rge', 'casas', 'casc', 'forbus', 'hombourg-haut'] as const;

export type SectorCode = (typeof sectorCodes)[number];

export const SECTORS: { code: SectorCode; label: string }[] = [
  { code: 'rge', label: 'RGE' },
  { code: 'casas', label: 'CASAS' },
  { code: 'casc', label: 'CASC' },
  { code: 'forbus', label: 'Forbus' },
  { code: 'hombourg-haut', label: 'Hombourg-Haut' },
];

export function normalizeSector(code: string): SectorCode {
  switch (code.trim().toLowerCase()) {
    case 'rge':
    case 'fluo57':
    case 'rgefluo57':
      return 'rge';
    case 'casas':
    case 'transavold':
    case 'transchool':
      return 'casas';
    case 'casc':
      return 'casc';
    case 'forbus':
      return 'forbus';
    case 'hombourg-haut':
    case 'hombourghaut':
      return 'hombourg-haut';
    default:
      return 'rge';
  }
}

export function sectorFromSearch(raw: string | null | undefined, fallbackDepot = ''): SectorCode {
  return normalizeSector(raw || fallbackDepot);
}

export function routeEditorHref(routeId: string, sector: SectorCode): string {
  return `/routes/${encodeURIComponent(routeId)}?sector=${sector}`;
}

export function newRouteHref(sector: SectorCode): string {
  return `/routes/new?sector=${sector}`;
}
