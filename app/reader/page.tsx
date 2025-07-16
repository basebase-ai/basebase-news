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
import { userService } from '@/services/user.service';


export default function ReaderPage() {
  const { currentUser, setCurrentUser, setCurrentSources, searchTerm, setSearchTerm } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);

  const loadSources = useCallback(async (user: any) => {
    if (!user) return;
    
    try {
      let userToUse = user;
      
      // Load user's sourceIds from BaseBase if not already loaded
      if (!user.sourceIds || user.sourceIds.length === 0) {
        console.log('[Reader] User sourceIds not loaded or empty, fetching from BaseBase...');
        try {
          const freshUser = await userService.getCurrentUser();
          console.log('[Reader] Got fresh user from BaseBase:', freshUser);
          if (freshUser) {
            const newSourceIds = freshUser.sourceIds || [];
            console.log(`[Reader] Fresh user has ${newSourceIds.length} sourceIds:`, newSourceIds);
            // Update global user state with fresh sourceIds
            const updatedUser = { ...user, sourceIds: newSourceIds };
            setCurrentUser(updatedUser);
            userToUse = updatedUser;
          } else {
            console.warn('[Reader] No fresh user returned from BaseBase');
          }
        } catch (error) {
          console.error('Error loading user sourceIds:', error);
        }
      } else {
        console.log(`[Reader] User already has ${user.sourceIds.length} sourceIds loaded:`, user.sourceIds);
      }
      
      // Load all sources and create a map keyed by ID
      const allSources = await sourceService.getSources();
      console.log(`[Reader] Loaded ${allSources.length} total sources`);
      
      const sourcesMap = new Map<string, ISource>();
      
      allSources.forEach(source => {
        if (source.id) {
          sourcesMap.set(source.id, source);
        }
      });
      
      // Look up user's subscribed sources from the map
      const userSources: ISource[] = [];
      console.log(`[Reader] User has ${userToUse.sourceIds?.length || 0} sourceIds:`, userToUse.sourceIds);
      
      if (userToUse.sourceIds) {
        userToUse.sourceIds.forEach((sourceId: string) => {
          const source = sourcesMap.get(sourceId);
          if (source) {
            console.log(`[Reader] Found source for ID ${sourceId}:`, source.name);
            userSources.push(source);
          } else {
            console.warn(`[Reader] No source found for ID ${sourceId}`);
          }
        });
      }
      
      console.log(`[Reader] Setting ${userSources.length} user sources`);
      setCurrentSources(userSources);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  }, [setCurrentSources, setCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      loadSources(currentUser);
    }
  }, [currentUser?.id, loadSources]); // Only depend on user ID, not the entire user object

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      // TODO: Implement refresh functionality in BaseBase
      // For now, just reload sources
      if (currentUser) {
        await loadSources(currentUser);
      }
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