'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import type { User } from '@/types';
import Avatar from './Avatar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

interface UserMenuProps {
  onAddSource: () => void;
}

interface UserPreferences {
  denseMode?: boolean;
  darkMode?: boolean;
}

export default function UserMenu({ onAddSource }: UserMenuProps) {
  const { currentUser, setCurrentUser, setDarkMode, setDenseMode, setSignInModalOpen } = useAppState();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        avatarRef.current &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setCurrentUser(null);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateUserPreferences = async (preferences: UserPreferences) => {
    try {
      const response = await fetch('/api/users/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
        if (preferences.denseMode !== undefined) setDenseMode(preferences.denseMode);
        if (preferences.darkMode !== undefined) setDarkMode(preferences.darkMode);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  if (!currentUser) {
    return (
      <button
        onClick={() => setSignInModalOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative">
      <div
        ref={avatarRef}
        onClick={() => setDropdownVisible(!dropdownVisible)}
        className="cursor-pointer"
      >
        <Avatar user={currentUser} size="md" />
      </div>

      {dropdownVisible && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700"
        >
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              {currentUser.first} {currentUser.last}
            </div>
            
            <button
              onClick={() => {
                onAddSource();
                setDropdownVisible(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Add source...
            </button>

            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Dense Mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentUser.denseMode}
                  onChange={(e) => updateUserPreferences({ denseMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentUser.darkMode}
                  onChange={(e) => updateUserPreferences({ darkMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 