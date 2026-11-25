'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté (localStorage)
    const auth = localStorage.getItem('farine_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  function login(username: string, password: string): boolean {
    const validUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'Farine';
    const validPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'FARINE';

    if (username === validUsername && password === validPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('farine_auth', 'true');
      return true;
    }
    return false;
  }

  function logout() {
    setIsAuthenticated(false);
    localStorage.removeItem('farine_auth');
    router.push('/admin/login');
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
