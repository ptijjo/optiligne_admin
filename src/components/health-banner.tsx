'use client';

import { getHealth } from '@/api/health';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';

export function HealthBanner() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    retry: 1,
    staleTime: 30_000,
  });
  if (!isError && data?.status === 'ok') {
    return null;
  }
  return (
    <Alert className="rounded-none border-x-0 border-t-0">
      <AlertDescription>L’API Optiligne est indisponible. Vérifiez que le backend tourne.</AlertDescription>
    </Alert>
  );
}
