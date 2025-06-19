'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { tokenService } from '@/lib/token.service';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Verifying your sign-in...');
  const hasVerified = useRef(false);

  useEffect(() => {
    console.log('[Verify] useEffect triggered');
    console.log('[Verify] searchParams:', searchParams);
    console.log('[Verify] hasVerified.current:', hasVerified.current);
    
    if (!searchParams || hasVerified.current) {
      console.log('[Verify] Skipping verification - no searchParams or already verified');
      return;
    }

    const verifyToken = async () => {
      console.log('[Verify] Starting token verification');
      
      // Prevent double execution
      if (hasVerified.current) {
        console.log('[Verify] Already verified, skipping');
        return;
      }
      hasVerified.current = true;
      
      const code = searchParams.get('code');
      const token = searchParams.get('token');
      
      console.log('[Verify] URL parameters:', {
        code: code ? `${code.substring(0, 10)}...` : null,
        token: token ? `${token.substring(0, 10)}...` : null,
        hasCode: !!code,
        hasToken: !!token
      });

      if (!code && !token) {
        console.error('[Verify] No verification code or token found');
        setError('No verification code or token found in the link.');
        return;
      }

      try {
        const url = `/api/auth/verify?${code ? `code=${code}` : `token=${token}`}`;
        console.log('[Verify] Making request to:', url.replace(/([?&](code|token)=)[^&]*/, '$1***'));
        
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });
        
        console.log('[Verify] Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        const data = await response.json();
        console.log('[Verify] Response data:', {
          hasToken: !!data.token,
          tokenLength: data.token?.length || 0,
          message: data.message,
          error: data.error
        });

        if (!response.ok) {
          console.error('[Verify] API response not ok:', data);
          throw new Error(data.error || 'Failed to verify.');
        }

        if (data.token) {
          console.log('[Verify] Token received, storing in localStorage');
          tokenService.setToken(data.token);
          
          // Verify token was actually stored
          const storedToken = tokenService.getToken();
          console.log('[Verify] Token verification:', {
            stored: !!storedToken,
            matches: storedToken === data.token,
            storedLength: storedToken?.length || 0
          });
          
          setMessage('Successfully signed in! Redirecting...');
          console.log('[Verify] Redirecting to /reader');
          router.push('/reader');
        } else {
          console.error('[Verify] No token in response data');
          throw new Error('No token received from server.');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        console.error('[Verify] Verification failed:', {
          error: err,
          message: errorMessage,
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(`Sign-in failed: ${errorMessage}`);
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {!error ? (
          <LoadingSpinner />
        ) : (
          <div className="text-red-500 text-xl font-semibold">
            <p>Error</p>
          </div>
        )}
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
          {error || message}
        </p>
        {error && (
          <button
            onClick={() => router.push('/auth/signin')}
            className="mt-6 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
} 