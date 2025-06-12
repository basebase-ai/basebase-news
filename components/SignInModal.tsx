'use client';

import React, { useState } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEnvelopeOpen, faSpinner, faPhone, faChevronDown } from '@fortawesome/free-solid-svg-icons';

export default function SignInModal() {
  const { isSignInModalOpen, setSignInModalOpen } = useAppState();
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showEmailOption, setShowEmailOption] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      console.log('Submitting sign-in form...');
      
      const payload: any = {
        first: formData.get('firstName'),
        last: formData.get('lastName'),
      };

      // Add phone or email based on what's provided
      const phone = formData.get('phone') as string;
      const email = formData.get('email') as string;
      
      if (phone && phone.trim()) {
        payload.phone = phone;
        // If phone is provided, email becomes optional but still included if provided
        if (email && email.trim()) {
          payload.email = email;
        } else {
          // Generate a placeholder email for phone-only signups
          payload.email = `phone_${phone.replace(/\D/g, '')}@temp.placeholder`;
        }
      } else if (email && email.trim()) {
        payload.email = email;
      } else {
        setError('Please provide either a phone number or email address.');
        return;
      }

      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Sign-in response:', data);

      if (response.ok) {
        setShowConfirmation(true);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignInModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {showConfirmation ? 'Check your messages' : 'Sign In'}
          </h3>
          <button
            onClick={() => {
              setSignInModalOpen(false);
              setShowConfirmation(false);
              setError('');
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
            <p className="text-gray-600 dark:text-gray-400">
              We&apos;ve sent you a magic link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FontAwesomeIcon icon={faPhone} className="mr-2 text-primary" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="(555) 123-4567"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
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
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
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
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowEmailOption(!showEmailOption)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 flex items-center"
              >
                <FontAwesomeIcon 
                  icon={faChevronDown} 
                  className={`mr-2 transition-transform ${showEmailOption ? 'rotate-180' : ''}`} 
                />
                Or sign in with email instead
              </button>
            </div>

            {showEmailOption && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faEnvelopeOpen} className="mr-2 text-gray-500" />
                  Email (optional)
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 