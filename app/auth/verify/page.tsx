'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    if (!searchParams) {
      return;
    }
    const token = searchParams.get('token');

    if (token) {
      fetch(`/api/auth/verify?token=${token}`)
        .then(response => {
          if (response.ok) {
            router.push('/');
          } else {
            // Handle error - maybe redirect to an error page or show a message
            router.push('/?error=verification_failed');
          }
        })
        .catch(error => {
          console.error('Verification request failed:', error);
          router.push('/?error=verification_failed');
        });
    } else {
        // Handle missing token
        router.push('/?error=missing_token');
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-lg">Verifying your sign-in...</p>
        <p>Please wait a moment.</p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyComponent />
    </Suspense>
  );
} 