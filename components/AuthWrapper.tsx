'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { tokenService } from '@/lib/token.service';
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

      // Small delay to ensure token is stored
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const token = tokenService.getToken();
      console.log('[AuthWrapper] Checking auth:', {
        pathname,
        hasToken: !!token,
        tokenLength: token?.length || 0
      });
      
      const isAuthRoute = AUTH_ROUTES.includes(pathname);

      if (!token) {
        // No token - show homepage or allow auth routes
        if (!isAuthRoute && pathname !== '/') {
          console.log('[AuthWrapper] No token, redirecting to homepage');
          router.replace('/');
        }
      } else {
        // Has token - redirect to reader if on homepage or auth routes
        if (isAuthRoute || pathname === '/') {
          console.log('[AuthWrapper] Has token, redirecting to reader');
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

  const token = tokenService.getToken();
  const isAuthRoute = pathname ? AUTH_ROUTES.includes(pathname) : false;

  // If we have a token and are not on auth routes, use AppLayout
  if (token && !isAuthRoute && pathname !== '/') {
    return <AppLayout>{children}</AppLayout>;
  }

  // Otherwise, render children directly (homepage or auth pages)
  return <>{children}</>;
} 