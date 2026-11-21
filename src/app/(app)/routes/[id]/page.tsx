'use client';

import { useAuth } from '@/auth/provider';
import { CircuitWorkbench } from '@/components/circuit-workbench';
import { EditorBreadcrumb } from '@/components/editor-breadcrumb';
import { sectorFromSearch } from '@/features/catalog/sector';
import { useSearchParams } from 'next/navigation';
import { Suspense, use } from 'react';

function RouteEditorInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  if (!user) {
    return null;
  }
  const sector = sectorFromSearch(searchParams.get('sector'), user.depotCode);
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-background p-2 sm:p-3 lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-sm">
        <EditorBreadcrumb sector={sector} />
        <span className="hidden text-xs text-muted-foreground sm:inline">Corriger le circuit</span>
      </div>
      <CircuitWorkbench routeId={id} operatorCode={user.operatorCode} depotCode={sector} />
    </main>
  );
}

export default function RouteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-3 text-sm text-muted-foreground">Chargement…</p>}>
      <RouteEditorInner params={params} />
    </Suspense>
  );
}
