'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (skipped) return;

    const timers = [
      setTimeout(() => setPhase(1), 300),   // Logo reveal starts
      setTimeout(() => setPhase(2), 1200),  // Brand names appear
      setTimeout(() => setPhase(3), 2200),  // Deal icons float
      setTimeout(() => setPhase(4), 3200),  // Transition begins
      setTimeout(() => onComplete(), 4000), // Complete
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, skipped]);

  const handleSkip = () => {
    setSkipped(true);
    onComplete();
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500',
        phase === 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
      style={{
        background: 'linear-gradient(135deg, #0f1419 0%, #1a2634 50%, #0d1117 100%)',
      }}
    >
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
      >
        Skip
      </button>

      <div className="relative flex flex-col items-center">
        {/* Phase 1: Three overlapping circles */}
        <div className="relative w-48 h-48 mb-8">
          {/* Cascadia circle - Turquoise */}
          <div
            className={cn(
              'absolute w-20 h-20 rounded-full transition-all duration-700',
              phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            )}
            style={{
              background: 'linear-gradient(135deg, #14B8A6 0%, #0d9488 100%)',
              boxShadow: phase >= 1 ? '0 0 40px rgba(20, 184, 166, 0.5)' : 'none',
              top: '20%',
              left: '15%',
              animationDelay: '0ms',
            }}
          />

          {/* Olympus circle - Amber */}
          <div
            className={cn(
              'absolute w-20 h-20 rounded-full transition-all duration-700 delay-150',
              phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            )}
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)',
              boxShadow: phase >= 1 ? '0 0 40px rgba(245, 158, 11, 0.5)' : 'none',
              top: '20%',
              right: '15%',
            }}
          />

          {/* Avencare circle - Purple */}
          <div
            className={cn(
              'absolute w-20 h-20 rounded-full transition-all duration-700 delay-300',
              phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            )}
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7c3aed 100%)',
              boxShadow: phase >= 1 ? '0 0 40px rgba(139, 92, 246, 0.5)' : 'none',
              bottom: '10%',
              left: '50%',
              transform: phase >= 1 ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.5)',
            }}
          />

          {/* Center merge glow for phase 4 */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-all duration-700',
              phase === 4 ? 'opacity-100' : 'opacity-0'
            )}
          >
            <div
              className="w-24 h-24 rounded-full animate-pulse"
              style={{
                background: 'linear-gradient(135deg, #14B8A6 0%, #0d9488 100%)',
                boxShadow: '0 0 60px rgba(20, 184, 166, 0.8)',
              }}
            />
          </div>
        </div>

        {/* Phase 2: Brand Names */}
        <div className="flex items-center gap-6 mb-6">
          <div
            className={cn(
              'transition-all duration-500',
              phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <span
              className="text-lg font-bold tracking-wider"
              style={{
                color: '#14B8A6',
                textShadow: '0 0 20px rgba(20, 184, 166, 0.5)',
              }}
            >
              CASCADIA
            </span>
          </div>

          <div className="w-px h-6 bg-white/20" />

          <div
            className={cn(
              'transition-all duration-500 delay-150',
              phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <span
              className="text-lg font-bold tracking-wider"
              style={{
                color: '#F59E0B',
                textShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
              }}
            >
              OLYMPUS
            </span>
          </div>

          <div className="w-px h-6 bg-white/20" />

          <div
            className={cn(
              'transition-all duration-500 delay-300',
              phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <span
              className="text-lg font-bold tracking-wider"
              style={{
                color: '#8B5CF6',
                textShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
              }}
            >
              AVENCARE
            </span>
          </div>
        </div>

        {/* Phase 3: Deal Icons floating up */}
        <div
          className={cn(
            'flex gap-4 mb-8 transition-all duration-700',
            phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {/* Building icon */}
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 animate-float-slow">
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          {/* Dollar icon */}
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 animate-float-medium">
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Chart icon */}
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 animate-float-fast">
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>

          {/* Heart icon for Healthcare */}
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 animate-float-slow delay-100">
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>

        {/* Tagline */}
        <div
          className={cn(
            'transition-all duration-700 delay-200',
            phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          <p className="text-sm text-white/40 tracking-widest uppercase">
            Intelligent Deal Analysis
          </p>
        </div>

        {/* Phase 4: SNFalyze text */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-500',
            phase === 4 ? 'opacity-100' : 'opacity-0'
          )}
        >
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{
              color: '#14B8A6',
              textShadow: '0 0 40px rgba(20, 184, 166, 0.6)',
            }}
          >
            SNFalyze
          </h1>
        </div>
      </div>

      {/* Connecting particles */}
      <div
        className={cn(
          'absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-500',
          phase >= 3 && phase < 4 ? 'opacity-100' : 'opacity-0'
        )}
      >
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-particle"
            style={{
              left: `${30 + Math.random() * 40}%`,
              top: `${40 + Math.random() * 20}%`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: `${2 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes particle {
          0% { opacity: 0; transform: translateY(0) scale(0); }
          50% { opacity: 1; transform: translateY(-30px) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0); }
        }
        .animate-float-slow { animation: float-slow 3s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 2.5s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 2s ease-in-out infinite; }
        .animate-particle { animation: particle 2s ease-out infinite; }
      `}</style>
    </div>
  );
}

// Hook to manage splash screen state - shows once per session
export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Check sessionStorage - splash shows once per browser session
    const hasSeenThisSession = sessionStorage.getItem('snfalyze_splash_seen');
    setShowSplash(!hasSeenThisSession);
    setHasChecked(true);
  }, []);

  const completeSplash = () => {
    sessionStorage.setItem('snfalyze_splash_seen', 'true');
    setShowSplash(false);
  };

  const resetSplash = () => {
    sessionStorage.removeItem('snfalyze_splash_seen');
  };

  return { showSplash, completeSplash, resetSplash, hasChecked };
}
