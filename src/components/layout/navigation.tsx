'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/context';
import {
  LayoutDashboard,
  Upload,
  FolderKanban,
  Building2,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Map,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Upload & Analyze', href: '/upload', icon: Upload },
  { name: 'Deals', href: '/deals', icon: FolderKanban },
  { name: 'Map', href: '/map', icon: Map },
  { name: 'Portfolio', href: '/portfolio', icon: Building2 },
  { name: 'Capital Partners', href: '/partners', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-cascadia-200">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">SF</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-semibold text-cascadia-900">SNFalyze</span>
                <span className="hidden md:inline text-xs text-cascadia-500 ml-2">
                  Cascadia Healthcare
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-cascadia-600 hover:bg-cascadia-100 hover:text-cascadia-900'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Menu (Desktop) */}
          <div className="hidden md:flex items-center gap-3 border-l border-cascadia-200 pl-4 ml-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-cascadia-500" />
              <span className="text-cascadia-700 font-medium">{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-sm text-cascadia-500 hover:text-cascadia-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="p-2 rounded-md text-cascadia-600 hover:bg-cascadia-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-cascadia-600 hover:bg-cascadia-100'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}

            {/* Mobile User Menu */}
            <div className="border-t border-cascadia-200 pt-4 mt-4">
              <div className="flex items-center gap-2 px-4 py-2 text-sm text-cascadia-600">
                <User className="w-5 h-5" />
                <span>Signed in as <strong>{user?.name}</strong></span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 w-full rounded-md transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
