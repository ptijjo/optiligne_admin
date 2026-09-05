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
      <div className="flex min-h-full flex-1 items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 sm:h-12 sm:px-5">
        <div className="flex min-w-0 items-baseline gap-2 sm:gap-3">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">Optiligne</p>
          <span className="hidden text-xs text-muted-foreground sm:inline">Admin</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden max-w-56 truncate text-xs text-muted-foreground sm:inline">
            {user.email}
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={() => logout()}>
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
