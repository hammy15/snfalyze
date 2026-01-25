'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { TopBar } from './topbar';

interface AppShellNewProps {
  children: React.ReactNode;
}

export function AppShellNew({ children }: AppShellNewProps) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Don't show shell on login page or if not authenticated
  const isLoginPage = pathname === '/login';
  const isPublicPage = pathname === '/' || pathname === '/security';
  const isAppPage = pathname.startsWith('/app');

  // Public pages and login - no shell
  if (isLoginPage || isPublicPage || !isAuthenticated) {
    return <>{children}</>;
  }

  // App pages - top nav only (no sidebar)
  if (isAppPage) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-page)]">
        <TopBar sidebarCollapsed={true} />

        <main className="pt-14 min-h-screen">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Legacy pages (e.g., /deals, /upload without /app prefix) - use old shell
  return <>{children}</>;
}
