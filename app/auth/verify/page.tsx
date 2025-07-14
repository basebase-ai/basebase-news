'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyCodeSMS } from '@/services/basebase.service';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Verifying your sign-in...');
  const hasVerified = useRef(false);

  useEffect(() => {
    console.log('[Verify] useEffect triggered');
    
    if (!searchParams || hasVerified.current) {
      console.log('[Verify] Skipping verification - no searchParams or already verified');
      return;
    }

    const verifyToken = async () => {
      console.log('[Verify] Starting verification');
      
      // Prevent double execution
      if (hasVerified.current) {
        console.log('[Verify] Already verified, skipping');
        return;
      }
      hasVerified.current = true;
      
      const phone = searchParams.get('phone');
      const code = searchParams.get('code');
      
      console.log('[Verify] URL parameters:', {
        phone: phone ? `${phone.substring(0, 3)}...` : null,
        code: code ? `${code.substring(0, 2)}...` : null,
        hasPhone: !!phone,
        hasCode: !!code
      });

      if (!phone || !code) {
        console.error('[Verify] Missing phone or code');
        setError('Invalid verification link. Please request a new code.');
        return;
      }

      try {
        console.log('[Verify] Verifying code');
        const success = await verifyCodeSMS(phone, code);
        
        if (success) {
          console.log('[Verify] Verification successful - BaseBase SDK handled token storage');
          setMessage('Successfully signed in! Redirecting...');
          console.log('[Verify] Redirecting to /reader');
          router.push('/reader');
        } else {
          console.error('[Verify] Verification failed');
          throw new Error('Verification failed. Please try again.');
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