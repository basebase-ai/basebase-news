'use client';

import SourceGrid from '@/components/SourceGrid';
import SearchResults from '@/components/SearchResults';
import { useAppState } from '@/lib/state/AppContext';
import { useEffect, useCallback, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faSearch, faSync } from '@fortawesome/free-solid-svg-icons';
import { fetchApi } from '@/lib/api';

export default function ReaderPage() {
  const { currentUser, setCurrentUser, setCurrentSources, searchTerm, setSearchTerm, setUpdatedSourceIds } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString());

  // Polling for new stories
  useEffect(() => {
    if (!currentUser) return;

    const checkForUpdates = async () => {
      try {
        const response = await fetchApi(`/api/stories/updates?since=${lastCheck}`);
        if (response.ok) {
          const { updatedSourceIds } = await response.json();
          if (updatedSourceIds && updatedSourceIds.length > 0) {
            setUpdatedSourceIds(prev => [...new Set([...prev, ...updatedSourceIds])]);
          }
          setLastCheck(new Date().toISOString());
        }
      } catch (error) {
        console.error('Failed to check for story updates:', error);
      }
    };

    const intervalId = setInterval(checkForUpdates, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, [currentUser, lastCheck, setUpdatedSourceIds]);

  const loadSources = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetchApi('/api/sources');
      if (response.ok) {
        const sources = await response.json();
        setCurrentSources(sources);
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  }, [currentUser, setCurrentSources]);

  useEffect(() => {
    if (currentUser) {
      loadSources();
    }
  }, [currentUser, loadSources]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const response = await fetchApi('/api/admin/refresh-all', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to start refresh');
      }
      // Optionally, show a toast message here to inform the user
      // that the refresh is happening in the background.
    } catch (err) {
      console.error(err);
      // Handle error, maybe show a toast
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="px-4 sm:px-6 lg:px-8 pt-0 pb-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My News</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="p-2 h-12 w-12 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              aria-label="Refresh all sources"
            >
              <FontAwesomeIcon icon={faSync} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <div className="relative flex-1 max-w-2xl">
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
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        {searchTerm.trim() ? (
          <SearchResults searchTerm={searchTerm} />
        ) : (
          <SourceGrid friendsListOpen={false} />
        )}
      </div>
    </div>
  );
} 