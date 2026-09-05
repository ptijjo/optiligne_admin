'use client';

import { isApiError } from '@/api/errors';
import { useAuth } from '@/auth/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema } from '@/features/auth/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

export function LoginForm() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) {
      router.replace('/');
    }
  }, [ready, user, router]);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <div className="w-full max-w-sm rounded-md border border-border bg-card p-6">
      <div className="mb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Optiligne</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Connexion</h2>
        <p className="mt-1 text-sm text-muted-foreground">Espace exploitant — circuits scolaires.</p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          setFormError(null);
          try {
            await login(values);
          } catch (error) {
            setFormError(isApiError(error) ? error.message : 'Identifiants invalides.');
          }
        })}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="username" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" className="mt-1 w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </div>
  );
}
