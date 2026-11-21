import { SECTORS, type SectorCode } from '@/features/catalog/sector';
import Link from 'next/link';

type Props = {
  sector: SectorCode;
  shortName?: string;
};

function sectorLabel(code: SectorCode): string {
  return SECTORS.find((s) => s.code === code)?.label ?? code;
}

export function EditorBreadcrumb({ sector, shortName }: Props) {
  return (
    <nav aria-label="Fil d’Ariane" className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
      <Link
        href="/"
        className="font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 ease-[var(--ease-out)] hover:text-primary hover:underline"
      >
        Lignes
      </Link>
      <span className="text-border" aria-hidden>
        /
      </span>
      <Link
        href={`/?sector=${sector}`}
        className="font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 ease-[var(--ease-out)] hover:text-primary hover:underline"
      >
        {sectorLabel(sector)}
      </Link>
      {shortName ? (
        <>
          <span className="text-border" aria-hidden>
            /
          </span>
          <span className="truncate font-mono text-sm font-semibold tracking-tight text-foreground">
            {shortName}
          </span>
        </>
      ) : null}
    </nav>
  );
}
