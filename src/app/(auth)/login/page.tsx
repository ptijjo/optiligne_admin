import { LoginForm } from '@/features/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion',
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#dce8e4_0%,_#eef1f4_45%,_#e4e9ef_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] size-[28rem] rounded-full bg-primary/10 blur-3xl"
      />
      <h1 className="sr-only">Connexion Optiligne Admin</h1>
      <LoginForm />
    </main>
  );
}
