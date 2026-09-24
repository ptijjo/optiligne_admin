'use client';

import { SECTORS, type SectorCode } from '@/features/catalog/sector';
import { cn } from '@/lib/utils';

type Props = {
  value: SectorCode;
  onChange: (sector: SectorCode) => void;
};

export function SectorFilter({ value, onChange }: Props) {
  return (
    <div
      className="-mx-1 flex gap-0 overflow-x-auto border-b border-border px-1"
      role="tablist"
      aria-label="Réseau"
    >
      {SECTORS.map((sector) => {
        const active = value === sector.code;
        return (
          <button
            key={sector.code}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
              active
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onChange(sector.code)}
          >
            {sector.label}
          </button>
        );
      })}
    </div>
  );
}
