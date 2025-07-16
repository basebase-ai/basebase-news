'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faPhone, faEnvelopeOpen, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { requestCodeSMS, verifyCodeSMS } from '@/services/basebase.service';
import { normalizePhoneNumber } from '@/lib/utils';

interface SignInFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  showEmailOption?: boolean;
  variant?: 'modal' | 'page';
}

export default function SignInForm({
  onSuccess,
  onError,
  showEmailOption = false,
  variant = 'modal'
}: SignInFormProps) {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [showEmailToggle, setShowEmailToggle] = useState<boolean>(false);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const code = formData.get('verification-code') as string;

    try {
      if (!code || !code.trim()) {
        handleError('Please enter the verification code.');
        return;
      }

      const success = await verifyCodeSMS(phone, code);

      if (success) {
        // BaseBase SDK automatically stores the token - no manual storage needed
        console.log('[SignInForm] Authentication successful, SDK handled token storage');
        
        if (variant === 'page') {
          router.push('/reader');
        } else {
          onSuccess?.();
        }
      } else {
        handleError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      handleError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const payload: any = {
        name: formData.get('name'),
      };

      // Add phone or email based on what's provided
      const phoneValue = formData.get('phone') as string;
      const email = formData.get('email') as string;
      
      if (phoneValue && phoneValue.trim()) {
        try {
          payload.phone = normalizePhoneNumber(phoneValue);
        } catch (error) {
          handleError(error instanceof Error ? error.message : 'Invalid phone number format');
          return;
        }
        // If phone is provided, email becomes optional but still included if provided
        if (email && email.trim()) {
          payload.email = email;
        } 
      } else if (email && email.trim()) {
        payload.email = email;
      } else {
        handleError('Please provide either a phone number or email address.');
        return;
      }

      const success = await requestCodeSMS(payload.name, payload.phone);

      if (success) {
        setPhone(payload.phone); // Store normalized phone number
        setName(payload.name);
        setShowConfirmation(true);
      } else {
        handleError('Something went wrong. Please try again.');
      }
    } catch (error) {
      handleError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setShowConfirmation(false);
    setError('');
    setIsLoading(false);
  };

  if (showConfirmation) {
    return (
      <div className="space-y-4">
        {variant === 'page' && (
          <div className="text-center py-8">
            <div className="mb-6 flex justify-center">
              <FontAwesomeIcon icon={faEnvelopeOpen} className="text-5xl text-green-500 mb-4" />
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              We&apos;ve sent you a verification code.
            </p>
          </div>
        )}
        
        <form onSubmit={handleVerifyCode} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md text-sm">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-2xl text-center tracking-wider [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              onClick={resetForm}
              className="text-primary hover:text-primary-dark text-sm font-medium"
            >
              Didn&apos;t receive the code? Click to resend
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
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
          Username
        </label>
        <input
          type="text"
          name="name"
          placeholder="Your username"
          required
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
        />
      </div>

      {showEmailOption && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowEmailToggle(!showEmailToggle)}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 flex items-center"
          >
            <FontAwesomeIcon 
              icon={faChevronDown} 
              className={`mr-2 transition-transform ${showEmailToggle ? 'rotate-180' : ''}`} 
            />
            Or sign in with email instead
          </button>
        </div>
      )}

      {showEmailOption && showEmailToggle && (
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
  );
} 