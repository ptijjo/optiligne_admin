'use client';

import { useAuth } from '@/auth/provider';
import { CreateRouteWizard } from '@/features/editor/create-route-wizard';
import Link from 'next/link';

export default function NewRoutePage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-background p-2 sm:p-3 lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link
          href="/"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:text-sm"
        >
          ← Lignes
        </Link>
        <h1 className="text-sm font-semibold tracking-tight sm:text-base">Nouvelle ligne</h1>
      </div>
      <CreateRouteWizard operatorCode={user.operatorCode} depotCode={user.depotCode} />
    </main>
  );
}
