'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { tokenService } from '@/lib/token.service';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Verifying your sign-in...');

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const verifyToken = async () => {
      const code = searchParams.get('code');
      const token = searchParams.get('token');

      if (!code && !token) {
        setError('No verification code or token found in the link.');
        return;
      }

      try {
        const url = `/api/auth/verify?${code ? `code=${code}` : `token=${token}`}`;
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });
        
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify.');
        }

        if (data.token) {
          tokenService.setToken(data.token);
          setMessage('Successfully signed in! Redirecting...');
          router.push('/reader');
        } else {
          throw new Error('No token received from server.');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        console.error('Verification failed:', errorMessage);
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