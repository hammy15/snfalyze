'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Bookmark,
  Moon,
  Sun,
} from 'lucide-react';

interface TopBarProps {
  sidebarCollapsed: boolean;
}

export function TopBar({ sidebarCollapsed }: TopBarProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [densityMode, setDensityMode] = useState<'comfort' | 'compact'>('comfort');

  const toggleDensity = () => {
    const newMode = densityMode === 'comfort' ? 'compact' : 'comfort';
    setDensityMode(newMode);
    document.body.classList.toggle('density-compact', newMode === 'compact');
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-14 z-40',
        'flex items-center px-4',
        'bg-white/95 dark:bg-surface-900/95 backdrop-blur-sm',
        'border-b border-surface-200 dark:border-surface-800',
        'transition-[left] duration-200'
      )}
      style={{
        left: sidebarCollapsed ? '4rem' : '15rem',
      }}
    >
      {/* Global Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-disabled)]" />
          <input
            type="text"
            placeholder="Search facilities, deals, or press ⌘K..."
            className="input pl-9 pr-4 w-full bg-[var(--gray-50)] border-transparent focus:bg-white focus:border-[var(--color-border-default)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {/* Saved Views Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSavedViews(!showSavedViews)}
            className="btn btn-ghost btn-sm"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">Views</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showSavedViews && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSavedViews(false)}
              />
              <div className="dropdown-menu right-0 left-auto z-20 w-64">
                <div className="px-3 py-2 border-b border-[var(--color-border-muted)]">
                  <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                    Saved Views
                  </span>
                </div>
                <div className="py-1">
                  <button className="dropdown-item w-full text-left">
                    <span className="flex-1">CA High-Risk SNFs</span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">Facilities</span>
                  </button>
                  <button className="dropdown-item w-full text-left">
                    <span className="flex-1">Active LOIs</span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">Deals</span>
                  </button>
                  <button className="dropdown-item w-full text-left">
                    <span className="flex-1">My Targets</span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">Targets</span>
                  </button>
                </div>
                <div className="border-t border-[var(--color-border-muted)] py-1">
                  <button className="dropdown-item w-full text-left text-[var(--accent-solid)]">
                    + Save current view
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Density Toggle */}
        <button
          onClick={toggleDensity}
          className="btn btn-ghost btn-sm"
          title={`Switch to ${densityMode === 'comfort' ? 'compact' : 'comfort'} mode`}
        >
          {densityMode === 'comfort' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications */}
        <button className="btn btn-ghost btn-sm relative">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--status-error-icon)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* User Menu */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--gray-100)] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                {user?.name || 'User'}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-[var(--color-text-tertiary)]" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="dropdown-menu right-0 left-auto z-20 w-48">
                <div className="px-3 py-2 border-b border-[var(--color-border-muted)]">
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">
                    {user?.name}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    Analyst
                  </div>
                </div>
                <div className="py-1">
                  <button className="dropdown-item w-full text-left">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button className="dropdown-item w-full text-left">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-[var(--color-border-muted)] py-1">
                  <button
                    onClick={logout}
                    className="dropdown-item danger w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
