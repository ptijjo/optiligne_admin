import { LoginForm } from '@/features/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-3 py-6 sm:p-6">
      <h1 className="sr-only">Connexion Optiligne Admin</h1>
      <LoginForm />
    </main>
  );
}
