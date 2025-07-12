'use client';


import Link from 'next/link';
import Image from 'next/image';
import SignInForm from '@/components/SignInForm';

export default function SignInPage() {
  const handleSuccess = () => {
    // Success is handled by the shared component
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/assets/images/logo_150x150.png"
              alt="NewsWithFriends"
              width={60}
              height={60}
              className="w-16 h-16 mx-auto"
            />
          </Link>
          <h1 className="text-3xl font-bold mt-4">
            Create your account
          </h1>
          <p className="text-gray-600 mt-2">
            Or{' '}
            <Link href="/" className="font-medium text-primary hover:text-primary-dark">
              go back to the homepage
            </Link>
          </p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-8">
          <SignInForm
            onSuccess={handleSuccess}
            showEmailOption={false}
            variant="page"
          />
        </div>
      </div>
    </div>
  );
} 