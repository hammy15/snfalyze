'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';
import {
  Radar,
  Crosshair,
  Building2,
  Handshake,
  LogOut,
  Settings,
  Crown,
  ChevronRight,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: typeof Radar;
  label: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/app/macro', icon: Radar, label: 'Portfolio Radar' },
  { href: '/app/deals', icon: Crosshair, label: 'Deal Pipeline' },
  { href: '/app/facilities', icon: Building2, label: 'Facilities' },
  { href: '/app/partners', icon: Handshake, label: 'Partners', roles: ['admin', 'vp', 'analyst'] },
];

interface RecentDeal {
  id: string;
  name: string;
  status: string;
}

export function FocusRail() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);

  useEffect(() => {
    fetch('/api/deals?limit=5')
      .then(r => r.json())
      .then(data => {
        const deals = (data.data || []).slice(0, 4);
        setRecentDeals(deals);
      })
      .catch(() => {});
  }, []);

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || 'viewer');
  });

  const isActive = (href: string) => {
    if (href === '/app' && pathname === '/app') return true;
    if (href !== '/app' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      <nav
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { setExpanded(false); setShowUserMenu(false); }}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-out',
          'bg-[#F8F7F4] dark:bg-surface-950 border-r border-[#E2DFD8] dark:border-surface-800',
          expanded ? 'w-56' : 'w-14'
        )}
      >
        {/* Logo */}
        <Link
          href="/app"
          className={cn(
            'flex items-center gap-3 px-3 h-14 border-b border-[#E2DFD8] dark:border-surface-800 group',
            'hover:bg-[#EFEDE8] dark:hover:bg-surface-800/50 transition-colors'
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">SF</span>
          </div>
          {expanded && (
            <span className="text-surface-800 dark:text-white font-semibold text-sm animate-fade-in">SNFalyze</span>
          )}
        </Link>

        {/* Main Nav */}
        <div className="flex-1 py-3 space-y-1 px-2">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-200 group relative',
                  active
                    ? 'bg-primary-500/15 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-[#EFEDE8] dark:hover:bg-surface-800/70'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-primary-500 dark:bg-primary-400 rounded-r-full" />
                )}
                <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'text-primary-600 dark:text-primary-400')} />
                {expanded && (
                  <span className="text-sm font-medium animate-fade-in truncate">{item.label}</span>
                )}
                {!expanded && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg border border-surface-200 dark:border-surface-700">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Team link for admin/vp */}
          {(user?.role === 'admin' || user?.role === 'vp') && (
            <Link
              href="/app/admin"
              className={cn(
                'flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-200 group relative',
                pathname.startsWith('/app/admin')
                  ? 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                  : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-[#EFEDE8] dark:hover:bg-surface-800/70'
              )}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              {expanded && (
                <span className="text-sm font-medium animate-fade-in">Team</span>
              )}
            </Link>
          )}
        </div>

        {/* Pinned Deals */}
        {recentDeals.length > 0 && (
          <div className="px-2 py-3 border-t border-[#E2DFD8] dark:border-surface-800">
            {expanded && (
              <span className="text-[10px] uppercase tracking-wider text-surface-500 px-2 mb-2 block">
                Recent Deals
              </span>
            )}
            <div className={cn('space-y-1', !expanded && 'flex flex-col items-center')}>
              {recentDeals.slice(0, expanded ? 4 : 3).map(deal => (
                <Link
                  key={deal.id}
                  href={`/app/deals/${deal.id}`}
                  className={cn(
                    'group relative transition-all duration-200',
                    expanded
                      ? 'flex items-center gap-2 px-2 py-1.5 rounded-lg text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-[#EFEDE8] dark:hover:bg-surface-800/70'
                      : 'block'
                  )}
                >
                  <div className={cn(
                    'rounded-full bg-gradient-to-br from-primary-500/30 to-primary-600/30 flex items-center justify-center flex-shrink-0 border border-primary-500/20',
                    expanded ? 'w-6 h-6' : 'w-7 h-7 mx-auto mb-1'
                  )}>
                    <span className="text-[9px] font-bold text-primary-300">
                      {deal.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {expanded && (
                    <span className="text-xs truncate animate-fade-in">{deal.name}</span>
                  )}
                  {!expanded && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg border border-surface-200 dark:border-surface-700">
                      {deal.name}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* User */}
        <div className="px-2 py-3 border-t border-[#E2DFD8] dark:border-surface-800 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'flex items-center gap-3 w-full px-2 py-2 rounded-lg transition-colors',
              'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-[#EFEDE8] dark:hover:bg-surface-800/70',
              showUserMenu && 'bg-[#EFEDE8] dark:bg-surface-800/70 text-surface-700 dark:text-surface-200'
            )}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            {expanded && (
              <div className="flex-1 min-w-0 text-left animate-fade-in">
                <div className="text-xs font-medium text-surface-700 dark:text-surface-200 truncate">{user?.name}</div>
                <div className="text-[10px] text-surface-500 dark:text-surface-500 capitalize">{user?.role}</div>
              </div>
            )}
          </button>

          {/* User Menu Popup */}
          {showUserMenu && expanded && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-xl overflow-hidden z-50 animate-scale-in">
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </Link>
              {(user?.role === 'admin' || user?.role === 'vp') && (
                <Link
                  href="/app/admin"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Super Admin
                </Link>
              )}
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-500 dark:text-rose-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
