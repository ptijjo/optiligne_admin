'use client';

import { useAuth } from '@/auth/provider';
import { CircuitWorkbench } from '@/components/circuit-workbench';
import Link from 'next/link';
import { use } from 'react';

export default function RouteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 sm:p-3 lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Lignes
        </Link>
        <h1 className="text-base font-bold sm:text-lg">Corriger le circuit</h1>
        <p className="hidden text-sm text-muted-foreground sm:inline">
          Horaires en lecture seule. La carte occupe le reste de l’écran.
        </p>
      </div>
      <CircuitWorkbench routeId={id} operatorCode={user.operatorCode} depotCode={user.depotCode} />
    </main>
  );
}
