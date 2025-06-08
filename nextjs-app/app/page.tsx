'use client';

import { useEffect, useCallback } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import SourceGrid from '@/components/SourceGrid';
import UserAvatar from '@/components/UserAvatar';
import SourceSettings from '@/components/SourceSettings';
import SignInModal from '@/components/SignInModal';
import Image from 'next/image';

export default function Home() {
  const { currentUser, setCurrentUser, setCurrentSources } = useAppState();

  const initializeUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  }, [setCurrentUser]);

  const loadSources = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch('/api/sources');
      if (response.ok) {
        const sources = await response.json();
        setCurrentSources(sources);
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  }, [currentUser, setCurrentSources]);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  useEffect(() => {
    if (currentUser) {
      loadSources();
    }
  }, [currentUser, loadSources]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 z-50 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src="/images/storylist_logomark.png"
              alt="StoryList"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">StoryList</h1>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search headlines..."
              className="w-48 md:w-64 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <UserAvatar />
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <SourceGrid />
        </div>
      </main>

      <SourceSettings />
      <SignInModal />
    </div>
  );
} 