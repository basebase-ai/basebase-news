'use client';

import React, { useState } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEnvelopeOpen } from '@fortawesome/free-solid-svg-icons';
import SignInForm from './SignInForm';

export default function SignInModal() {
  const { isSignInModalOpen, setSignInModalOpen } = useAppState();
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  const handleClose = () => {
    setSignInModalOpen(false);
    setShowConfirmation(false);
  };

  const handleSuccess = () => {
    setShowConfirmation(true);
    // Close modal after a short delay to show success message
    setTimeout(() => {
      handleClose();
    }, 2000);
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
            onClick={handleClose}
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
              We&apos;ve sent you a verification code. Check your messages!
            </p>
          </div>
        ) : (
          <SignInForm
            onSuccess={handleSuccess}
            showEmailOption={true}
            variant="modal"
          />
        )}
      </div>
    </div>
  );
} 