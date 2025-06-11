'use client';

import SourceGrid from '@/components/SourceGrid';
import { useAppState } from '@/lib/state/AppContext';
import { useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faSearch } from '@fortawesome/free-solid-svg-icons';

export default function ReaderPage() {
  const { currentUser, setCurrentUser, setCurrentSources, searchTerm, setSearchTerm } = useAppState();

  const initializeUser = useCallback(async () => {
    try {
      const response = await fetch('/api/users/me');
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
    <div className="min-h-screen dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reader</h1>
          <div className="relative flex-1 max-w-2xl ml-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search articles..."
              className="w-full h-12 px-6 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <SourceGrid friendsListOpen={false} />
      </div>
    </div>
  );
} 