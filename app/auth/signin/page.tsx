'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeOpen } from '@fortawesome/free-solid-svg-icons';

export default function SignInPage() {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          first: formData.get('firstName'),
          last: formData.get('lastName'),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowConfirmation(true);
      } else {
        console.error('Sign-in failed:', data.message);
        // You might want to show an error message to the user here
      }
    } catch (error) {
      console.error('Sign in error:', error);
      // You might want to show an error message to the user here
    }
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
            {showConfirmation ? 'Check your email' : 'Create your account'}
          </h1>
          <p className="text-gray-600 mt-2">
            {showConfirmation ? (
              "We've sent you a magic link to sign in."
            ) : (
              <>
                Or{' '}
                <Link href="/" className="font-medium text-primary hover:text-primary-dark">
                  go back to the homepage
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-8">
          {showConfirmation ? (
            <div className="text-center py-8">
              <div className="mb-6 flex justify-center">
                <FontAwesomeIcon icon={faEnvelopeOpen} className="text-5xl text-primary mb-4" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Continue with Email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 