'use client';

import { RouteList } from '@/features/catalog/route-list';
import { useAuth } from '@/auth/provider';

export default function HomePage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 overflow-auto p-6">
      <h1 className="mb-2 text-2xl font-bold">Tableau de bord</h1>
      <p className="mb-1 text-muted-foreground">
        Lignes affectées à <span className="font-medium text-foreground">{user.operatorCode}</span>
        {' · dépôt '}
        <span className="font-medium text-foreground">{user.depotCode}</span>
      </p>
      <p className="mb-6 text-muted-foreground">
        Filtrez par type (régulière, scolaire, associée), puis ouvrez une ligne pour ajuster les
        arrêts et le tracé. Les téléphones du dépôt utiliseront le circuit enregistré.
      </p>
      <RouteList operatorCode={user.operatorCode} depotCode={user.depotCode} />
    </main>
  );
}
