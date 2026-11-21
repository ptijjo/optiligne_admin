'use client';

import { HealthBanner } from '@/components/health-banner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/provider';
import Link from 'next/link';
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
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-card/95 px-3 shadow-[0_1px_0_rgb(18_32_51/0.04)] backdrop-blur-md sm:h-14 sm:px-5">
        <Link
          href="/"
          className="group flex min-w-0 items-baseline gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2.5"
        >
          <span className="truncate text-base font-semibold tracking-tight text-foreground transition-colors duration-200 ease-[var(--ease-out)] group-hover:text-primary">
            Optiligne
          </span>
          <span className="hidden rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-medium text-accent-foreground sm:inline">
            Admin
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden max-w-56 truncate text-xs text-muted-foreground sm:inline">
            {user.email}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2.5 text-xs transition-transform duration-150 ease-[var(--ease-out)]"
            onClick={() => logout()}
          >
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
