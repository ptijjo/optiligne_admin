'use client';

import { RouteList } from '@/features/catalog/route-list';
import { useAuth } from '@/auth/provider';
import Link from 'next/link';

export default function HomePage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 overflow-auto px-3 py-5 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Lignes</h1>
        <Link
          href="/routes/new"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nouvelle ligne
        </Link>
      </div>
      <RouteList operatorCode={user.operatorCode} depotCode={user.depotCode} />
    </main>
  );
}
