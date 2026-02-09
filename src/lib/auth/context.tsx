'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthUser {
  name: string;
  role: 'admin' | 'user';
  loginTime: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (name: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Individual user accounts (username -> { password, role })
const USER_ACCOUNTS: Record<string, { password: string; role: 'admin' | 'user' }> = {
  will: { password: process.env.NEXT_PUBLIC_WILL_PASSWORD || '', role: 'user' },
  dustin: { password: process.env.NEXT_PUBLIC_DUSTIN_PASSWORD || '', role: 'user' },
};

// Shared password fallback (admin access)
const SHARED_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || '';
const AUTH_STORAGE_KEY = 'snfalyze_auth';

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
          name: parsed.name,
          role: parsed.role || 'admin',
          loginTime: new Date(parsed.loginTime),
        });
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/design-demo'];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user && !publicRoutes.includes(pathname)) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = (name: string, password: string): boolean => {
    const nameLower = name.trim().toLowerCase();
    let role: 'admin' | 'user' = 'admin';

    // Check individual user accounts first
    const userAccount = USER_ACCOUNTS[nameLower];
    if (userAccount && userAccount.password && password === userAccount.password) {
      role = userAccount.role;
    } else if (password === SHARED_PASSWORD && SHARED_PASSWORD !== '') {
      // Fallback to shared password (admin)
      role = 'admin';
    } else {
      return false;
    }

    const newUser: AuthUser = {
      name: name.trim(),
      role,
      loginTime: new Date(),
    };

    setUser(newUser);
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        name: newUser.name,
        role: newUser.role,
        loginTime: newUser.loginTime.toISOString(),
      })
    );

    router.push('/');
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push('/login');
  };

  // Show nothing while loading to prevent flash
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
