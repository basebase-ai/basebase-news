'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isUserAuthenticated } from '@/services/basebase.service';
import LoadingSpinner from './LoadingSpinner';
import AppLayout from './AppLayout';

const AUTH_ROUTES = ['/auth/signin', '/auth/verify'];

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!pathname) {
        setIsLoading(false);
        return;
      }

      // Small delay to ensure authentication state is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const isAuthenticated = isUserAuthenticated();
      console.log('[AuthWrapper] Checking auth:', {
        pathname,
        isAuthenticated
      });
      
      const isAuthRoute = AUTH_ROUTES.includes(pathname);

      if (!isAuthenticated) {
        // Not authenticated - show homepage or allow auth routes
        if (!isAuthRoute && pathname !== '/') {
          console.log('[AuthWrapper] Not authenticated, redirecting to homepage');
          router.replace('/');
        }
      } else {
        // Authenticated - redirect to reader if on homepage or auth routes
        if (isAuthRoute || pathname === '/') {
          console.log('[AuthWrapper] Authenticated, redirecting to reader');
          router.replace('/reader');
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const isAuthenticated = isUserAuthenticated();
  const isAuthRoute = pathname ? AUTH_ROUTES.includes(pathname) : false;

  // If authenticated and not on auth routes, use AppLayout
  if (isAuthenticated && !isAuthRoute && pathname !== '/') {
    return <AppLayout>{children}</AppLayout>;
  }

  // Otherwise, render children directly (homepage or auth pages)
  return <>{children}</>;
} 