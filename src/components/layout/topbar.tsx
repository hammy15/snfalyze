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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search facilities, deals, or press ⌘K..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface-100 dark:bg-surface-800 border border-transparent rounded-lg focus:bg-white dark:focus:bg-surface-700 focus:border-surface-300 dark:focus:border-surface-600 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {/* Saved Views Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSavedViews(!showSavedViews)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-md transition-colors"
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
              <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg">
                <div className="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
                  <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Saved Views
                  </span>
                </div>
                <div className="py-1">
                  <button className="flex items-center justify-between w-full px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <span className="flex-1 text-left">CA High-Risk SNFs</span>
                    <span className="text-xs text-surface-500">Facilities</span>
                  </button>
                  <button className="flex items-center justify-between w-full px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <span className="flex-1 text-left">Active LOIs</span>
                    <span className="text-xs text-surface-500">Deals</span>
                  </button>
                  <button className="flex items-center justify-between w-full px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <span className="flex-1 text-left">My Targets</span>
                    <span className="text-xs text-surface-500">Targets</span>
                  </button>
                </div>
                <div className="border-t border-surface-200 dark:border-surface-700 py-1">
                  <button className="w-full px-3 py-2 text-sm text-left text-primary-600 dark:text-primary-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
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
          className="flex items-center justify-center w-8 h-8 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-md transition-colors"
          title={`Switch to ${densityMode === 'comfort' ? 'compact' : 'comfort'} mode`}
        >
          {densityMode === 'comfort' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-8 h-8 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-md transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* User Menu */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {user?.name || 'User'}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-surface-500" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg">
                <div className="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
                  <div className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {user?.name}
                  </div>
                  <div className="text-xs text-surface-500">
                    Analyst
                  </div>
                </div>
                <div className="py-1">
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-surface-200 dark:border-surface-700 py-1">
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
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
