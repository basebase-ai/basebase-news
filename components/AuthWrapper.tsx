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
      if (!pathname) {
        setIsLoading(false);
        return;
      }
      
      const token = tokenService.getToken();
      const isAuthRoute = AUTH_ROUTES.includes(pathname);

      if (!token) {
      // No token - show homepage or allow auth routes
      if (!isAuthRoute && pathname !== '/') {
        router.replace('/');
      }
    } else {
      // Has token - redirect to reader if on homepage or auth routes
            if (isAuthRoute || pathname === '/') {
              router.replace('/reader');
            }
    }

          setIsLoading(false);
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