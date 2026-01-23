import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'SNFalyze | Cascadia Healthcare',
  description: 'AI-driven underwriting and deal intelligence platform for skilled nursing, assisted living, and independent living facilities.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
