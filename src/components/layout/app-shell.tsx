'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Navigation } from './navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Don't show navigation on login page
  const isLoginPage = pathname === '/login';

  if (isLoginPage || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />
      <main className="pt-16 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </>
  );
}
