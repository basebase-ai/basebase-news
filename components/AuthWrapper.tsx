'use client';

import { useAppState } from '@/lib/state/AppContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { tokenService } from '@/lib/token.service';
import { fetchApi } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';
import AppLayout from './AppLayout';

const AUTH_ROUTES = ['/auth/signin', '/auth/verify'];
const PUBLIC_ROUTES = ['/'];

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { currentUser, setCurrentUser } = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authenticate = async () => {
      if (!pathname) {
        setIsLoading(false);
        return;
      }

      const token = tokenService.getToken();
      const isAuthRoute = AUTH_ROUTES.includes(pathname);
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

      if (!token) {
        if (!isAuthRoute && !isPublicRoute) {
          console.log('No token found, redirecting to sign-in.');
          router.replace('/auth/signin');
        } else {
          setIsLoading(false);
        }
        return;
      }

      // If we have a token, but no user data in context, fetch it
      if (!currentUser) {
        try {
          console.log('Token found, fetching user data...');
          const response = await fetchApi('/api/users/me');
          if (response.ok) {
            const { user } = await response.json();
            setCurrentUser(user);
            console.log('User data loaded successfully.');

            // If user is on an auth page with a valid session, redirect to reader
            if (isAuthRoute) {
              router.replace('/reader');
            }
          } else {
            // Token is invalid
            tokenService.removeToken();
            if (!isAuthRoute && !isPublicRoute) {
              router.replace('/auth/signin');
            }
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          tokenService.removeToken();
          if (!isAuthRoute && !isPublicRoute) {
            router.replace('/auth/signin');
          }
        } finally {
          setIsLoading(false);
        }
      } else {
         // User is already in context
        if (isAuthRoute) {
          router.replace('/reader');
        }
        setIsLoading(false);
      }
    };

    authenticate();
  }, [pathname, currentUser, setCurrentUser, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const isAuthRoute = pathname ? AUTH_ROUTES.includes(pathname) : false;
  const isPublicRoute = pathname ? PUBLIC_ROUTES.includes(pathname) : false;

  // If we are on a protected route and have a user, render the full layout
  if (currentUser && !isAuthRoute && !isPublicRoute) {
    return <AppLayout>{children}</AppLayout>;
  }

  // Otherwise, for public pages or auth flows, render children directly
  return <>{children}</>;
} 