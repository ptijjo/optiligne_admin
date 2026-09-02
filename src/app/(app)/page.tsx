'use client';

import { RouteList } from '@/features/catalog/route-list';
import { useAuth } from '@/auth/provider';

export default function HomePage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 overflow-auto px-3 py-4 sm:p-6">
      <h1 className="mb-2 text-xl font-bold sm:text-2xl">Tableau de bord</h1>
      <p className="mb-1 text-sm text-muted-foreground sm:text-base">
        Lignes affectées à <span className="font-medium text-foreground">{user.operatorCode}</span>
        {' · dépôt '}
        <span className="font-medium text-foreground">{user.depotCode}</span>
      </p>
      <p className="mb-4 text-sm text-muted-foreground sm:mb-6 sm:text-base">
        Filtrez par type, puis ouvrez une ligne pour ajuster les arrêts et le tracé.
        <span className="hidden sm:inline">
          {' '}
          Les téléphones du dépôt utiliseront le circuit enregistré.
        </span>
      </p>
      <RouteList operatorCode={user.operatorCode} depotCode={user.depotCode} />
    </main>
  );
}
