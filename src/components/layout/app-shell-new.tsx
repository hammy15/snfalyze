'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { cn } from '@/lib/utils';

interface AppShellNewProps {
  children: React.ReactNode;
}

export function AppShellNew({ children }: AppShellNewProps) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Don't show shell on login page or if not authenticated
  const isLoginPage = pathname === '/login';
  const isPublicPage = pathname === '/' || pathname === '/security';
  const isAppPage = pathname.startsWith('/app');

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Save sidebar state to localStorage
  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  // Public pages and login - no shell
  if (isLoginPage || isPublicPage || !isAuthenticated) {
    return <>{children}</>;
  }

  // App pages - full shell
  if (isAppPage) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-page)]">
        <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
        <TopBar sidebarCollapsed={sidebarCollapsed} />

        <main
          className={cn(
            'pt-14 min-h-screen transition-[margin] duration-200',
            sidebarCollapsed ? 'ml-16' : 'ml-60'
          )}
        >
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
