'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faPhone } from '@fortawesome/free-solid-svg-icons';
import { tokenService } from '@/lib/token.service';

export default function SignInPage() {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    console.log('[SignIn] Verification code submission started');
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const code = formData.get('verification-code') as string;

    try {
      if (!code || !code.trim()) {
        setError('Please enter the verification code.');
        return;
      }

      console.log('[SignIn] Verifying code for:', { phone, code });
      
      const response = await fetch(`/api/auth/verify?phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (response.ok && data.token) {
        console.log('[SignIn] Verification successful, redirecting...');
        // Store the token using our token service
        tokenService.setToken(data.token);
        router.push('/reader');
      } else {
        console.error('[SignIn] Verification failed:', data.error);
        setError(data.error || 'Invalid verification code. Please try again.');
      }
    } catch (error) {
      console.error('[SignIn] Error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('[SignIn] Verification completed');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    console.log('[SignIn] Form submission started');
    
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const phone = formData.get('phone') as string;
      const firstName = formData.get('firstName') as string;
      const lastName = formData.get('lastName') as string;
      
      if (!phone || !phone.trim()) {
        setError('Please provide a phone number.');
        return;
      }

      const name = `${firstName} ${lastName}`.trim();
      if (!name) {
        setError('Please provide your name.');
        return;
      }

      console.log('[SignIn] Requesting code for:', { phone, name });
      
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[SignIn] Success! Showing confirmation screen');
        setPhone(phone);
        setName(name);
        setShowConfirmation(true);
      } else {
        console.error('[SignIn] Failed:', data.error);
        setError(data.error || 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error('[SignIn] Error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('[SignIn] Form submission completed');
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
              "We've sent you a verification code."
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
        {showConfirmation ? (
          <div className="bg-white shadow-md rounded-lg p-8">
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              {/* Hidden input to catch phone autofill */}
              <input 
                type="tel" 
                name="phone"
                autoComplete="tel"
                style={{ display: 'none' }} 
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="verification-code"
                  placeholder="Enter the code we sent you"
                  required
                  autoComplete="off"
                  disabled={isLoading}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed text-2xl text-center tracking-wider [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmation(false);
                    setError('');
                    setIsLoading(false);
                  }}
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  Didn&apos;t receive the code? Click to resend
                </button>
              </div>
            </form>
          </div>
        ) : (
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
                  required
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