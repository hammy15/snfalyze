'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BrainOrb } from './BrainOrb';
import {
  LayoutDashboard,
  Crosshair,
  GraduationCap,
  Layers,
  Database,
  Search,
  Lightbulb,
  BarChart3,
  ArrowLeft,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
}

const BRAIN_NAV: NavItem[] = [
  { href: '/app/brain', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/app/brain/analyze', icon: Crosshair, label: 'Analyze' },
  { href: '/app/brain/learning', icon: GraduationCap, label: 'Learning' },
  { href: '/app/brain/pipeline', icon: Layers, label: 'Pipeline' },
  { href: '/app/brain/cortex', icon: Database, label: 'Cortex' },
  { href: '/app/brain/research', icon: Search, label: 'Research' },
  { href: '/app/brain/aha', icon: Lightbulb, label: 'AHA' },
  { href: '/app/brain/analytics', icon: BarChart3, label: 'Analytics' },
];

// Top 5 items shown in mobile bottom bar
const MOBILE_NAV = BRAIN_NAV.slice(0, 5);

export function NeuralRail() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [brainHealth, setBrainHealth] = useState<{
    newo: { status: 'online' | 'degraded' | 'offline' };
    dev: { status: 'online' | 'degraded' | 'offline' };
  }>({ newo: { status: 'online' }, dev: { status: 'online' } });

  useEffect(() => {
    const saved = localStorage.getItem('snf_dark_mode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('snf_dark_mode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    fetch('/api/cil/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.brains) setBrainHealth(data.brains);
      })
      .catch(() => {});
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/app/brain' && pathname === '/app/brain') return true;
    if (href !== '/app/brain' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      {/* ═══ Desktop Sidebar ═══ */}
      <nav
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 flex-col transition-all duration-300 ease-out',
          'bg-[#F8F7F4] dark:bg-surface-950 border-r border-[#E2DFD8] dark:border-surface-800',
          'hidden md:flex',
          expanded ? 'w-56' : 'w-14'
        )}
      >
        {/* Logo / Brain status */}
        <div className="h-14 flex items-center border-b border-[#E2DFD8] dark:border-surface-800 px-2 gap-2 shrink-0">
          {expanded ? (
            <div className="flex items-center gap-3 px-1">
              <div className="flex items-center gap-1">
                <BrainOrb id="newo" status={brainHealth.newo.status} size="sm" />
                <BrainOrb id="dev" status={brainHealth.dev.status} size="sm" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-surface-800 dark:text-surface-100">CIL</div>
                <div className="text-[9px] text-surface-400 truncate">Cascadia Intelligence</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 w-full">
              <div className="w-3 h-3 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 py-3 px-1.5 space-y-0.5 overflow-y-auto">
          {BRAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 h-10 px-2.5 rounded-lg transition-colors',
                isActive(item.href)
                  ? 'bg-primary-500/15 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 hover:bg-[#EFEDE8] dark:hover:bg-surface-800'
              )}
            >
              {isActive(item.href) && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-primary-500 rounded-r-full" />
              )}
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              <span
                className={cn(
                  'text-sm font-medium whitespace-nowrap transition-opacity duration-200',
                  expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                )}
              >
                {item.label}
              </span>

              {/* Tooltip when collapsed */}
              {!expanded && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-surface-800 text-xs rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 shadow-lg border border-surface-200 dark:border-surface-700 transition-opacity pointer-events-none">
                  {item.label}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Dark Mode Toggle */}
        <div className="px-2 mb-1">
          <button
            onClick={toggleDark}
            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-[#EFEDE8] dark:hover:bg-surface-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            <span className={cn('text-xs whitespace-nowrap transition-opacity duration-200', expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden')}>
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>

        {/* Back to SNFalyze */}
        <div className="p-2 border-t border-[#E2DFD8] dark:border-surface-800">
          <Link
            href="/app/deals"
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-[#EFEDE8] dark:hover:bg-surface-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span
              className={cn(
                'text-xs whitespace-nowrap transition-opacity duration-200',
                expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              )}
            >
              Back to SNFalyze
            </span>
          </Link>
        </div>
      </nav>

      {/* ═══ Mobile Bottom Bar ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#F8F7F4] dark:bg-surface-950 border-t border-[#E2DFD8] dark:border-surface-800 safe-area-pb">
        <div className="flex items-center justify-around h-14 px-1">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-0 transition-colors',
                isActive(item.href)
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-surface-400'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium truncate">{item.label}</span>
            </Link>
          ))}
          {/* More button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors',
              mobileOpen ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400'
            )}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* ═══ Mobile Expanded Menu ═══ */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed bottom-14 left-0 right-0 z-35 md:hidden bg-[#F8F7F4] dark:bg-surface-950 border-t border-[#E2DFD8] dark:border-surface-800 rounded-t-2xl shadow-lg p-4 space-y-1 safe-area-pb">
            {/* Brain status */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#E2DFD8] dark:border-surface-800">
              <BrainOrb id="newo" status={brainHealth.newo.status} size="sm" />
              <BrainOrb id="dev" status={brainHealth.dev.status} size="sm" />
              <span className="text-xs font-bold text-surface-700 dark:text-surface-200">CIL</span>
              <span className="text-[10px] text-surface-400">Cascadia Intelligence</span>
            </div>

            {/* All nav items */}
            {BRAIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive(item.href)
                    ? 'bg-primary-500/15 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                    : 'text-surface-600 dark:text-surface-300 hover:bg-[#EFEDE8] dark:hover:bg-surface-800'
                )}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDark}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-[#EFEDE8] dark:hover:bg-surface-800 transition-colors w-full"
            >
              {darkMode ? <Sun className="w-4.5 h-4.5 shrink-0" /> : <Moon className="w-4.5 h-4.5 shrink-0" />}
              <span className="text-sm font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className="pt-2 border-t border-[#E2DFD8] dark:border-surface-800 mt-2">
              <Link
                href="/app/deals"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-surface-400 hover:text-surface-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs">Back to SNFalyze</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
