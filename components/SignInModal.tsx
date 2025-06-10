'use client';

import React, { useState } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEnvelopeOpen } from '@fortawesome/free-solid-svg-icons';

export default function SignInModal() {
  const { isSignInModalOpen, setSignInModalOpen } = useAppState();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      console.log('Submitting sign-in form...');
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
      console.log('Sign-in response:', data);

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

  if (!isSignInModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Sign In
          </h3>
          <button
            onClick={() => {
              setSignInModalOpen(false);
              setShowConfirmation(false);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FontAwesomeIcon icon={faTimes} className="text-2xl" />
          </button>
        </div>

        {showConfirmation ? (
          <div className="text-center py-8">
            <div className="mb-6 flex justify-center">
              <FontAwesomeIcon icon={faEnvelopeOpen} className="text-5xl text-green-500 mb-4" />
            </div>
            <h4 className="text-xl font-semibold mb-2">Check your email</h4>
            <p className="text-gray-600 dark:text-gray-400">
              We&apos;ve sent you a magic link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
  );
} 