'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { FocusRail } from './focus-rail';
import { CommandBar } from './command-bar';
import { ContextBreadcrumb } from './context-breadcrumb';

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

  // Workspace pages need full-bleed layout (no padding wrapper)
  const isWorkspacePage = pathname.includes('/workspace');

  // Brain pages have their own NeuralRail — skip standard shell chrome
  const isBrainPage = pathname.startsWith('/app/brain');

  // App pages - Focus Rail + Context Breadcrumb + Command Bar
  if (isAppPage) {
    // Brain pages render their own NeuralRail layout
    if (isBrainPage) {
      return (
        <div className="min-h-screen bg-[#F8F7F4] dark:bg-surface-900">
          <CommandBar />
          {children}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F8F7F4] dark:bg-surface-900">
        <FocusRail />
        <ContextBreadcrumb />
        <CommandBar />

        {isWorkspacePage ? (
          <main className="pl-14 pt-12 h-screen">
            {children}
          </main>
        ) : (
          <main className="pl-14 pt-12 min-h-screen">
            <div className="p-6">
              {children}
            </div>
          </main>
        )}
      </div>
    );
  }

  // Legacy pages (e.g., /deals, /upload without /app prefix) - use old shell
  return <>{children}</>;
}
