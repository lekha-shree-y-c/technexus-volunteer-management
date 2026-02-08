'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminUser {
  id: string;
  username: string;
  full_name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  admin: AdminUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Only run on client side
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('adminToken');
        const userStr = localStorage.getItem('adminUser');

        if (token && userStr) {
          const user = JSON.parse(userStr);
          setAdmin(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Redirect based on auth status
  useEffect(() => {
    if (isLoading) return;

    // Only run on client side
    if (typeof window === 'undefined') return;

    try {
      console.log('[AuthContext Redirect] Checking redirect. pathname:', pathname, 'isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
      
      // If trying to access login page but already logged in, redirect to dashboard
      if (pathname === '/login' && isAuthenticated) {
        console.log('[AuthContext Redirect] User authenticated on login page, calling router.push("/")');
        router.push('/');
        return;
      }

      // If trying to access protected routes but not logged in, redirect to login
      if (pathname !== '/login' && !isAuthenticated) {
        console.log('[AuthContext Redirect] User not authenticated on protected route, calling router.push("/login")');
        router.push('/login');
        return;
      }
      
      console.log('[AuthContext Redirect] No redirect needed - auth state matches route');
    } catch (error) {
      console.error('[AuthContext Redirect] Error during redirect:', error);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = async (username: string, password: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.token && data.admin) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        setAdmin(data.admin);
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
      throw new Error('An error occurred during login');
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear server-side cookie
      await fetch('/api/admin-logout', {
        method: 'POST',
        credentials: 'include', // Include cookies to clear
      });
    } catch (error) {
      console.error('[AuthContext] Error clearing server-side session:', error);
    } finally {
      // Clear client-side storage
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setAdmin(null);
      setIsAuthenticated(false);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        admin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
