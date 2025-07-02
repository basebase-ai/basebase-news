'use client';

import SourceGrid from '@/components/SourceGrid';
import SearchResults from '@/components/SearchResults';
import { useAppState } from '@/lib/state/AppContext';
import { useEffect, useCallback, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faSearch, faSync, faPlus } from '@fortawesome/free-solid-svg-icons';
import AddSourceModal from '@/components/AddSourceModal';
import { sourceService } from '@/services/source.service';
import { ISource } from '@/services/source.service';

export default function ReaderPage() {
  const { currentUser, setCurrentUser, setCurrentSources, searchTerm, setSearchTerm } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);

  const loadSources = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const sources = await sourceService.getSources();
      // Transform sources to match the UI's expected format
      const transformedSources = sources.map(source => ({
        _id: source.id || '',
        name: source.name,
        homepageUrl: source.homepageUrl || '',
        imageUrl: undefined,
        lastScrapedAt: source.lastScrapedAt,
        metadata: source.metadata ? JSON.parse(source.metadata) : {},
      }));
      setCurrentSources(transformedSources);
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
      // TODO: Implement refresh functionality in BaseBase
      // For now, just reload sources
      await loadSources();
    } catch (err) {
      console.error(err);
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
                className="w-full h-12 px-6 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
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
            <button
              onClick={() => setAddSourceModalOpen(true)}
              className="shrink-0 w-12 h-12 flex items-center justify-center text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
              title="Add Source"
            >
              <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
            </button>
          </div>
        </div>
        {searchTerm.trim() ? (
          <SearchResults searchTerm={searchTerm} />
        ) : (
          <SourceGrid friendsListOpen={false} />
        )}
      </div>
      <AddSourceModal isOpen={addSourceModalOpen} onClose={() => setAddSourceModalOpen(false)} />
    </div>
  );
} 