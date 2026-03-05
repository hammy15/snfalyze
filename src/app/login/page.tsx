'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/app/brain';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(redirect);
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Connection error');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm">
      {/* Brain Orbs */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-teal-500 shadow-[0_0_16px_rgba(20,184,166,0.5)] animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-teal-400/30 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="w-8 h-px bg-gradient-to-r from-teal-500/50 via-surface-300 to-orange-500/50" />
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.5)] animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 rounded-full bg-orange-400/30 animate-ping" style={{ animationDuration: '2.5s' }} />
        </div>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-surface-800">SNFalyze<span className="text-primary-500">.ai</span></h1>
        <p className="text-xs text-surface-400 mt-1.5">Cascadia Intelligence Layer</p>
      </div>

      <form onSubmit={handleLogin} className="neu-card-warm p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1.5">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full neu-input px-4 py-2.5 text-sm"
            placeholder="Enter your name"
            required
            autoFocus
            autoComplete="name"
          />
          <p className="text-[10px] text-surface-300 mt-1">This identifies you in the system</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full neu-input px-4 py-2.5 text-sm"
            placeholder="Enter site password"
            required
          />
        </div>

        {error && (
          <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 neu-button-primary rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="text-center text-[10px] text-surface-300 mt-6">
        Cascadia Healthcare &middot; Confidential
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-teal-500 animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
