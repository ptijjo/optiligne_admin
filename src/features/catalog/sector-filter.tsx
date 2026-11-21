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
      className="flex gap-1.5 overflow-x-auto pb-0.5"
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
              'shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)]',
              active
                ? 'bg-primary font-medium text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground',
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
