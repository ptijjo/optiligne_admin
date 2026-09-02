import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Optiligne Admin',
    template: '%s — Optiligne Admin',
  },
  description: 'Correction des circuits scolaires GTFS',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className={`${inter.className} flex min-h-full flex-col bg-background text-foreground`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
