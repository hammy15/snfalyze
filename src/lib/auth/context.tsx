'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserRole } from './roles';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  loginTime: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (emailOrName: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'snfalyze_auth';

// Keep shared password for backward compatibility
const SHARED_PASSWORD = (process.env.NEXT_PUBLIC_APP_PASSWORD || '').trim();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load auth state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser({
          id: parsed.id || 'shared',
          name: parsed.name,
          email: parsed.email || '',
          role: parsed.role || 'analyst',
          avatarUrl: parsed.avatarUrl || null,
          loginTime: new Date(parsed.loginTime),
        });
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Public routes
  const publicRoutes = ['/login', '/design-demo'];

  useEffect(() => {
    if (!isLoading && !user && !publicRoutes.includes(pathname)) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (emailOrName: string, password: string): Promise<boolean> => {
    // Try API login first
    try {
      const isEmail = emailOrName.includes('@');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: isEmail ? emailOrName : undefined,
          name: !isEmail ? emailOrName : undefined,
          password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const authUser: AuthUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email || '',
            role: data.user.role || 'analyst',
            avatarUrl: data.user.avatarUrl || null,
            loginTime: new Date(),
          };

          setUser(authUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            ...authUser,
            loginTime: authUser.loginTime.toISOString(),
          }));

          router.push('/');
          return true;
        }
      }
    } catch {
      // API not available, fall through to legacy
    }

    // Legacy fallback: shared password
    if (password === SHARED_PASSWORD && SHARED_PASSWORD) {
      const authUser: AuthUser = {
        id: 'shared',
        name: emailOrName.includes('@') ? emailOrName.split('@')[0] : emailOrName,
        email: emailOrName.includes('@') ? emailOrName : '',
        role: 'analyst',
        avatarUrl: null,
        loginTime: new Date(),
      };

      setUser(authUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        ...authUser,
        loginTime: authUser.loginTime.toISOString(),
      }));

      router.push('/');
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Clear the session cookie
    document.cookie = 'snfalyze_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
