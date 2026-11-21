'use client';

import { RouteList } from '@/features/catalog/route-list';
import { newRouteHref, sectorFromSearch, type SectorCode } from '@/features/catalog/sector';
import { useAuth } from '@/auth/provider';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function HomeInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sector, setSector] = useState<SectorCode>(() =>
    sectorFromSearch(searchParams.get('sector'), user?.depotCode ?? ''),
  );
  if (!user) {
    return null;
  }

  const onSectorChange = (next: SectorCode) => {
    setSector(next);
    router.replace(`/?sector=${next}`);
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 overflow-auto px-3 py-5 sm:px-6 sm:py-7">
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Lignes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choisissez un circuit à corriger sur la carte.</p>
        </div>
        <Link
          href={newRouteHref(sector)}
          className="inline-flex h-10 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-primary/90 active:scale-[0.98]"
        >
          Nouvelle ligne
        </Link>
      </div>
      <RouteList
        operatorCode={user.operatorCode}
        depotCode={user.depotCode}
        sector={sector}
        onSectorChange={onSectorChange}
      />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Chargement…</p>}>
      <HomeInner />
    </Suspense>
  );
}
