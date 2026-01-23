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
  { name: 'Partners', href: '/partners', icon: Users },
  { name: 'Sandbox', href: '/app/sandbox', icon: Calculator },
  { name: 'Deal Memory', href: '/app/deals/memory', icon: Brain },
  { name: 'Map', href: '/map', icon: Map },
  { name: 'Tools', href: '/app/tools', icon: Calculator },
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
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen z-50',
        'flex flex-col',
        'bg-white dark:bg-surface-900',
        'border-r border-surface-200 dark:border-surface-800',
        'transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-surface-200 dark:border-surface-800">
        <Link href="/app" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">SF</span>
          </div>
          {!collapsed && (
            <span className="text-base font-semibold text-surface-900 dark:text-surface-100">
              SNFalyze
            </span>
          )}
        </Link>
      </div>

      {/* Search (collapsed shows icon only) */}
      {!collapsed && (
        <div className="px-3 py-3">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <kbd className="ml-auto text-xs bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 rounded">⌘K</kbd>
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
                'flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-sm font-medium',
                'text-surface-600 dark:text-surface-400',
                'hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100',
                'transition-colors',
                isActive(item.href) && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
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
              <Clock className="w-3.5 h-3.5 text-surface-400" />
              <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">
                Recent
              </span>
            </div>
            <div className="space-y-0.5">
              {recentItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-1.5 text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-md transition-colors truncate"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-surface-200 dark:border-surface-800 py-2">
        {bottomNavItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-sm font-medium',
              'text-surface-600 dark:text-surface-400',
              'hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100',
              'transition-colors',
              isActive(item.href) && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-full flex items-center justify-center text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 hover:border-surface-400 shadow-sm transition-colors z-10"
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
