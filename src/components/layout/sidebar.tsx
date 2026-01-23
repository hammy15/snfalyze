'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Target,
  Briefcase,
  Bell,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Map,
  Clock,
  Search,
  Calculator,
  Users,
  FolderKanban,
  Brain,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Deal Pipeline', href: '/app/deals', icon: FolderKanban },
  { name: 'Facilities', href: '/app/facilities', icon: Building2 },
  { name: 'Partners', href: '/app/partners', icon: Users },
  { name: 'Sandbox', href: '/app/sandbox', icon: Calculator },
  { name: 'Deal Memory', href: '/app/deal-memory', icon: Brain },
  { name: 'Map', href: '/app/map', icon: Map },
  { name: 'Reports', href: '/app/reports', icon: FileText },
];

const bottomNavItems: NavItem[] = [
  { name: 'Admin', href: '/app/admin', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [recentItems] = useState([
    { name: 'Harbor Health', href: '/app/facilities/1' },
    { name: 'Sunrise Portfolio', href: '/app/deals/1' },
    { name: 'Valley View SNF', href: '/app/facilities/2' },
  ]);

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app';
    return pathname.startsWith(href);
  };

  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-[var(--color-border-muted)]">
        <Link href="/app" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">SF</span>
          </div>
          {!collapsed && (
            <span className="text-base font-semibold text-[var(--color-text-primary)]">
              SNFalyze
            </span>
          )}
        </Link>
      </div>

      {/* Search (collapsed shows icon only) */}
      {!collapsed && (
        <div className="px-3 py-3">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-tertiary)] bg-[var(--gray-50)] rounded-md hover:bg-[var(--gray-100)] transition-colors">
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <kbd className="ml-auto text-xs bg-[var(--gray-200)] px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'sidebar-nav-item',
                isActive(item.href) && 'active',
                collapsed && 'justify-center px-0 mx-2'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="icon" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="min-w-5 h-5 flex items-center justify-center text-xs font-medium bg-[var(--status-error-bg)] text-[var(--status-error-text)] rounded-full px-1.5">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          ))}
        </div>

        {/* Recent Items */}
        {!collapsed && (
          <div className="mt-6 px-3">
            <div className="flex items-center gap-2 px-2 mb-2">
              <Clock className="w-3.5 h-3.5 text-[var(--color-text-disabled)]" />
              <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                Recent
              </span>
            </div>
            <div className="space-y-0.5">
              {recentItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--gray-50)] rounded-md transition-colors truncate"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-[var(--color-border-muted)] py-2">
        {bottomNavItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'sidebar-nav-item',
              isActive(item.href) && 'active',
              collapsed && 'justify-center px-0 mx-2'
            )}
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="icon" />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] shadow-sm transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
}
