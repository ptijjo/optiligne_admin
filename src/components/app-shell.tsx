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
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 sm:min-h-14 sm:px-4">
        <p className="truncate text-sm font-semibold text-primary sm:text-base">Optiligne Admin</p>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline md:max-w-xs">
            {user.email}
          </span>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => logout()}>
            <span className="sm:hidden">Quitter</span>
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>
      <HealthBanner />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
