'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check session on mount via server API
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (r.ok) return r.json();
        return { user: null };
      })
      .then((data) => {
        if (data.user) {
          setUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email || '',
            role: data.user.role || 'analyst',
            avatarUrl: data.user.avatarUrl || null,
            loginTime: new Date(),
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (emailOrName: string, password: string): Promise<boolean> => {
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
          setUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email || '',
            role: data.user.role || 'analyst',
            avatarUrl: data.user.avatarUrl || null,
            loginTime: new Date(),
          });
          router.push('/app/brain');
          return true;
        }
      }
    } catch {
      // Login failed
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    document.cookie = 'snfalyze_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-teal-500 animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
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
