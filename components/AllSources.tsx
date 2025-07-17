'use client';

import { useState, useEffect, useCallback } from 'react';
import { Source, User } from '@/types';
import { useAppState } from '@/lib/state/AppContext';
import LoadingSpinner from './LoadingSpinner';
import OverlappingAvatars from './OverlappingAvatars';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCog, faSearch, faChevronRight, faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
// import SourceSettings from './SourceSettings'; // Component no longer exists

import { isUserAuthenticated } from '@/services/basebase.service';
import { getCurrentUser, subscribeToSource, unsubscribeFromSource } from '@/services/user.service';
import { getSources } from '@/services/source.service';
import { storyService } from '@/services/story.service';
import { AdminService } from '@/services/admin.service';
import { formatTimeAgo } from '@/lib/utils';

interface SourceStory {
  id: string;
  articleUrl: string;
  fullHeadline: string;
  summary?: string;
  imageUrl?: string;
  createdAt: string;
  status: 'READ' | 'UNREAD';
  starred: boolean;
}

export default function AllSources() {
  const { currentUser, setCurrentUser, currentSources, setCurrentSources, friends } = useAppState();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceListVersion, setSourceListVersion] = useState(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [sourceStories, setSourceStories] = useState<Record<string, SourceStory[]>>({});
  const [loadingStories, setLoadingStories] = useState<Set<string>>(new Set());
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean>(false);

  const loadUserData = useCallback(async () => {
    try {
      if (!isUserAuthenticated()) {
        console.warn('[AllSources] User not authenticated');
        return;
      }

      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        // Check admin status
        const isAdmin = await AdminService.isUserAdmin(user.id);
        setIsCurrentUserAdmin(isAdmin);
      }
    } catch (error) {
      console.error('[AllSources] Error loading user data:', error);
    }
  }, []);

  const loadSources = useCallback(async () => {
    try {
      if (!isUserAuthenticated()) {
        console.warn('[AllSources] User not authenticated');
        return;
      }

      const sources = await getSources();
      setSources(sources);
    } catch (error) {
      console.error('[AllSources] Error loading sources:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!isUserAuthenticated()) {
          console.warn('[AllSources] User not authenticated');
          return;
        }
        
        const sourcesData = await getSources();
        const sourcesArray = Array.isArray(sourcesData) ? sourcesData : [];
        // Map ISource to Source format with id
        const sources = sourcesArray.map(source => ({
          ...source,
          id: source.id || '',
        }));
        
        setSources(sources);
      } catch (error) {
        console.error('[AllSources] Error loading sources:', error);
        setError('Failed to load sources');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const fetchSourceStories = async (sourceId: string) => {
    if (!isSourceAdded(sourceId)) return;
    
    setLoadingStories(prev => new Set(prev).add(sourceId));
    try {
      if (!isUserAuthenticated()) {
        console.warn('[AllSources] User not authenticated');
        return;
      }

      // Use the new efficient method that handles caching and status fetching
      const storiesWithStatus = await storyService.getStoriesWithStatus(
        sourceId,
        currentUser?.id,
        3
      );
      
      // Convert to SourceStory format
      const stories: SourceStory[] = storiesWithStatus.map(story => ({
        id: story.id || '',
        articleUrl: story.url,
        fullHeadline: story.headline,
        summary: story.summary,
        imageUrl: story.imageUrl,
        createdAt: story.publishedAt,
        status: story.status || 'UNREAD',
        starred: story.starred || false,
      }));
      
      setSourceStories(prev => ({ ...prev, [sourceId]: stories }));
    } catch (error) {
      console.error('Failed to fetch stories for source:', error);
    } finally {
      setLoadingStories(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const toggleSourceExpansion = (sourceId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
      if (!sourceStories[sourceId] && isSourceAdded(sourceId)) {
        fetchSourceStories(sourceId);
      }
    }
    setExpandedSources(newExpanded);
  };

  const handleSourceToggle = async (sourceId: string, isSubscribed: boolean) => {
    try {
      if (!isUserAuthenticated()) {
        console.warn('[AllSources] User not authenticated');
        return;
      }

      if (isSubscribed) {
        await unsubscribeFromSource(sourceId);
      } else {
        await subscribeToSource(sourceId);
      }
      
      // Reload user data to get updated subscriptions
      await loadUserData();
    } catch (error) {
      console.error('[AllSources] Error toggling source:', error);
    }
  };

  const handleAddSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      if (!isUserAuthenticated()) {
        console.warn('[AllSources] User not authenticated');
        return;
      }

      // Add source using userService directly
      await subscribeToSource(sourceId);
      
      // Update local state
      const updatedSourceIds = [...currentUser.sourceIds, sourceId];
      setCurrentUser({ ...currentUser, sourceIds: updatedSourceIds });
      
      // Get the source details using sourceService
      const allSources = await getSources();
      const source = allSources.find(s => s.id === sourceId);
      if (source && source.id && !currentSources?.some(s => s.id === source.id)) {
        const sourceWithId = { ...source, id: source.id } as Source;
        setCurrentSources([...(currentSources || []), sourceWithId]);
      }
    } catch (error) {
      console.error('[AllSources] Failed to add source:', error);
    }
  };

  const handleRemoveSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      if (!isUserAuthenticated()) {
        console.warn('[AllSources] User not authenticated');
        return;
      }

      // Remove source using userService directly
      await unsubscribeFromSource(sourceId);
      
      // Update local state
      const updatedSourceIds = currentUser.sourceIds.filter(id => id !== sourceId);
      setCurrentUser({ ...currentUser, sourceIds: updatedSourceIds });
      
      // Update current sources
      const updatedSources = currentSources?.filter(s => s.id !== sourceId);
      setCurrentSources(updatedSources || []);
    } catch (error) {
      console.error('[AllSources] Failed to remove source:', error);
    }
  };

  const isSourceAdded = (sourceId: string): boolean => {
    return currentUser?.sourceIds.includes(sourceId) || false;
  };

  const getFriendsWithSource = (sourceId: string): User[] => {
    return friends.filter(friend => friend.sourceIds.includes(sourceId));
  };

  const renderFriendAvatars = (sourceId: string) => {
    const friendsWithSource = getFriendsWithSource(sourceId);
    return <OverlappingAvatars users={friendsWithSource} />;
  };

  const handleEditSource = (source: Source | null) => {
    console.log('handleEditSource called', { 
      source: source?.name || 'new source', 
      currentUser: currentUser ? { 
        email: currentUser.email, 
        isAdmin: isCurrentUserAdmin 
      } : null 
    });
    setEditingSource(source);
    setSourceSettingsOpen(true);
  };

  const handleSourceSave = () => {
    setSourceListVersion(v => v + 1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const filteredSources = sources
    .filter(source => 
      source.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      source.homepageUrl.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Function to get sortable name (ignoring "The" prefix)
      const getSortableName = (name: string): string => {
        const lowerName = name.toLowerCase();
        return lowerName.startsWith('the ') ? lowerName.slice(4) : lowerName;
      };
      
      const nameA = getSortableName(a.name);
      const nameB = getSortableName(b.name);
      
      return nameA.localeCompare(nameB);
    });



  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white shrink-0">Sources</h1>
        <div className="relative flex-1 max-w-2xl ml-8">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sources..."
            className="w-full h-12 px-6 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
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
          className="ml-4 shrink-0 w-12 h-12 flex items-center justify-center text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
          onClick={() => handleEditSource(null)}
          title="Create New Source"
        >
          <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
        </button>
      </div>

      {loading && <LoadingSpinner message="Loading sources..." />}
      {error && <div className="text-center py-4 text-red-500">{error}</div>}
      
      {!loading && !error && (
        <div className="space-y-2">
          {filteredSources.map(source => (
            <div key={source.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3 flex-1">
                  {isSourceAdded(source.id) && (
                    <button
                      onClick={() => toggleSourceExpansion(source.id)}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                      <FontAwesomeIcon 
                        icon={expandedSources.has(source.id) ? faChevronDown : faChevronRight} 
                        className="h-4 w-4" 
                      />
                    </button>
                  )}
                  {!isSourceAdded(source.id) && <div className="w-6" />}
                  {source.imageUrl && <img src={source.imageUrl} alt={source.name} className="w-8 h-8 object-contain" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{source.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{source.homepageUrl}</p>
                      </div>
                      <div className="ml-4">
                        {renderFriendAvatars(source.id)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isCurrentUserAdmin && (
                    <button onClick={() => handleEditSource(source)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                      <FontAwesomeIcon icon={faCog} className="h-5 w-5" />
                    </button>
                  )}
                  {isSourceAdded(source.id) ? (
                    <button onClick={() => handleRemoveSource(source.id)} className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700">
                      Remove
                    </button>
                  ) : (
                    <button onClick={() => handleAddSource(source.id)} className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700">
                      Add
                    </button>
                  )}
                </div>
              </div>
              
              {/* Expanded stories section */}
              {expandedSources.has(source.id) && isSourceAdded(source.id) && (
                <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-25 dark:bg-gray-800/30">
                  {loadingStories.has(source.id) ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      Loading stories...
                    </div>
                  ) : sourceStories[source.id]?.length > 0 ? (
                    <div className="p-4 space-y-3">
                      {sourceStories[source.id].map(story => (
                        <div key={story.id} className="flex items-start space-x-3 group">
                          {story.imageUrl && (
                            <img 
                              src={story.imageUrl} 
                              alt={story.fullHeadline}
                              className="w-12 h-12 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <a
                              href={story.articleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block group-hover:text-primary"
                              onClick={async (e) => {
                                e.preventDefault();
                                
                                // Mark story as read if user is logged in
                                if (currentUser) {
                                  try {
                                    await storyService.markStoryAsRead(currentUser.id, story.id);
                                    console.log('Story marked as read:', story.id);
                                    
                                    // Update local state to reflect read status
                                    setSourceStories(prev => ({
                                      ...prev,
                                      [source.id]: prev[source.id]?.map(s => 
                                        s.id === story.id ? { ...s, status: 'READ' as const } : s
                                      ) || []
                                    }));
                                  } catch (error) {
                                    console.error('Failed to mark story as read:', error);
                                  }
                                }
                                
                                // Open the URL
                                window.open(story.articleUrl, '_blank');
                              }}
                            >
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-5">
                                {story.fullHeadline}
                              </h4>
                              {story.summary && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                  {story.summary}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTimeAgo(story.createdAt)}
                                </span>
                                {story.status === 'READ' && (
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    Read
                                  </span>
                                )}
                                {story.starred && (
                                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                    ★
                                  </span>
                                )}
                              </div>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      No recent stories available
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SourceSettings component no longer exists */}
    </>
  );
} 