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
    console.log('[AuthWrapper] useEffect triggered', {
      pathname,
      hasCurrentUser: !!currentUser,
      currentUserId: currentUser?._id || null
    });
    
    const authenticate = async () => {
      if (!pathname) {
        console.log('[AuthWrapper] No pathname available, setting loading to false');
        setIsLoading(false);
        return;
      }

      console.log('[AuthWrapper] Starting authentication check for path:', pathname);
      
      const token = tokenService.getToken();
      const isAuthRoute = AUTH_ROUTES.includes(pathname);
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

      console.log('[AuthWrapper] Route analysis:', {
        pathname,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        isAuthRoute,
        isPublicRoute,
        authRoutes: AUTH_ROUTES,
        publicRoutes: PUBLIC_ROUTES
      });

      if (!token) {
        console.log('[AuthWrapper] No token found');
        if (!isAuthRoute && !isPublicRoute) {
          console.log('[AuthWrapper] Protected route without token, redirecting to sign-in');
          router.replace('/auth/signin');
        } else {
          console.log('[AuthWrapper] Auth/public route without token, allowing access');
          setIsLoading(false);
        }
        return;
      }

      // If we have a token, but no user data in context, fetch it
      if (!currentUser) {
        console.log('[AuthWrapper] Token found but no user data, fetching from API');
        try {
          console.log('[AuthWrapper] Making request to /api/users/me');
          const response = await fetchApi('/api/users/me');
          
          console.log('[AuthWrapper] User API response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
          });
          
          if (response.ok) {
            const { user } = await response.json();
            console.log('[AuthWrapper] User data received:', {
              userId: user?.id,
              userEmail: user?.email,
              userName: user?.first + ' ' + user?.last
            });
            
            setCurrentUser(user);
            console.log('[AuthWrapper] User data loaded successfully');

            // If user is on an auth page with a valid session, redirect to reader
            if (isAuthRoute || pathname === '/') {
              console.log('[AuthWrapper] Valid user on auth route, redirecting to /reader');
              router.replace('/reader');
            }
          } else {
            console.error('[AuthWrapper] Failed to fetch user data - invalid token');
            // Token is invalid
            tokenService.removeToken();
            console.log('[AuthWrapper] Token removed from storage');
            
            if (!isAuthRoute && !isPublicRoute) {
              console.log('[AuthWrapper] Protected route with invalid token, redirecting to sign-in');
              router.replace('/auth/signin');
            }
          }
        } catch (error) {
          console.error('[AuthWrapper] Failed to fetch user data:', {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          
          tokenService.removeToken();
          console.log('[AuthWrapper] Token removed due to fetch error');
          
          if (!isAuthRoute && !isPublicRoute) {
            console.log('[AuthWrapper] Protected route with fetch error, redirecting to sign-in');
            router.replace('/auth/signin');
          }
        } finally {
          console.log('[AuthWrapper] Setting loading to false');
          setIsLoading(false);
        }
      } else {
                 console.log('[AuthWrapper] User already in context:', {
           userId: currentUser._id,
           userEmail: currentUser.email
         });
        
         // User is already in context
        if (isAuthRoute || pathname === '/') {
          console.log('[AuthWrapper] Authenticated user on auth route, redirecting to /reader');
          router.replace('/reader');
        }
        console.log('[AuthWrapper] Setting loading to false');
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