'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeOpen, faSpinner, faPhone, faChevronDown } from '@fortawesome/free-solid-svg-icons';

export default function SignInPage() {
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
            {showConfirmation ? 'Check your messages' : 'Create your account'}
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
        {showConfirmation ? null : (
          <div className="bg-white shadow-md rounded-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FontAwesomeIcon icon={faPhone} className="mr-2 text-primary" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailOption(!showEmailOption)}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FontAwesomeIcon icon={faEnvelopeOpen} className="mr-2 text-gray-500" />
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
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
          </div>
        )}
      </div>
    </div>
  );
} 