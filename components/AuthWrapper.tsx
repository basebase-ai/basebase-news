'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication by calling the API endpoint
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include'
        });
        
        const isAuth = response.ok;
        setIsAuthenticated(isAuth);
        
        console.log('AuthWrapper auth check:', {
          isAuthenticated: isAuth,
          status: response.status
        });
      } catch (error) {
        console.error('AuthWrapper: Failed to check authentication:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
    
    // Listen for auth changes (e.g., after login)
    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Render with or without layout based on auth status
  return isAuthenticated ? (
    <AppLayout>{children}</AppLayout>
  ) : (
    <main>{children}</main>
  );
} 