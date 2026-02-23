'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Crosshair,
  Building2,
  Eye,
  Wrench,
  Zap,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';

interface WalkthroughStep {
  title: string;
  description: string;
  icon: typeof Crosshair;
  color: string;
  action?: string;
  href?: string;
}

const STEPS: WalkthroughStep[] = [
  {
    title: 'Welcome to SNFalyze',
    description: 'Your AI-powered underwriting platform for healthcare real estate. Let\'s walk through the key features.',
    icon: Sparkles,
    color: 'text-primary-500',
  },
  {
    title: 'Dashboard',
    description: 'Your command center — pipeline stats, watchlist alerts, recent deals, and quick access to tools.',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    href: '/app',
  },
  {
    title: 'Deal Pipeline',
    description: 'Track deals from intake through close. Create new deals, view Kanban board, and open deal workspaces.',
    icon: Crosshair,
    color: 'text-primary-500',
    href: '/app/deals',
  },
  {
    title: 'Facility Watchlist',
    description: 'Monitor facilities for CMS rating changes, SFF status, and penalty events. Get automated alerts overnight.',
    icon: Eye,
    color: 'text-purple-500',
    href: '/app/tools/watchlist',
  },
  {
    title: 'Quick Screen Calculator',
    description: 'Run Cascadia\'s valuation rules on any deal — get an instant GO, CONDITIONAL, or PASS signal.',
    icon: Zap,
    color: 'text-amber-500',
    href: '/app/tools/quick-screen',
  },
  {
    title: 'Analysis Tools',
    description: '25+ financial, quality, and intelligence tools — cap rate calc, pro forma generator, bulk CCN profiler, and more.',
    icon: Wrench,
    color: 'text-emerald-500',
    href: '/app/tools',
  },
  {
    title: 'You\'re All Set',
    description: 'Start by creating a new deal or exploring the tools. Press ⌘K anytime for quick navigation.',
    icon: Sparkles,
    color: 'text-primary-500',
    action: 'Get Started',
  },
];

const STORAGE_KEY = 'snfalyze_onboarding_complete';

export function Walkthrough() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Check if onboarding was completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Show after a brief delay so the page loads first
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleNavigate = (href?: string) => {
    if (href) router.push(href);
    handleNext();
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-surface-100 dark:bg-surface-800">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <div className={cn('w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center', 'bg-primary-50 dark:bg-primary-900/20')}>
              <Icon className={cn('w-7 h-7', current.color)} />
            </div>

            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2">
              {current.title}
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
              {current.description}
            </p>

            {current.href && (
              <button
                onClick={() => handleNavigate(current.href)}
                className="mt-4 text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 mx-auto"
              >
                Go there now <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    i === step ? 'bg-primary-500' : i < step ? 'bg-primary-300' : 'bg-surface-300 dark:bg-surface-600'
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              )}
              {step === 0 && (
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-600 transition-colors"
                >
                  Skip tour
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 bg-primary-500 text-white text-xs font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                {step === STEPS.length - 1 ? (current.action || 'Done') : 'Next'}
                {step < STEPS.length - 1 && <ArrowRight className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Re-trigger walkthrough from settings
export function ResetOnboarding() {
  return (
    <button
      onClick={() => {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      }}
      className="text-xs text-primary-500 hover:text-primary-600 font-medium"
    >
      Replay walkthrough
    </button>
  );
}
