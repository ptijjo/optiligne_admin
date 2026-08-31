'use client';

import { HealthBanner } from '@/components/health-banner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/provider';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.replace('/login');
    }
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="flex min-h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <p className="font-semibold text-primary">Optiligne Admin</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button type="button" variant="outline" onClick={() => logout()}>
            Déconnexion
          </Button>
        </div>
      </header>
      <HealthBanner />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
