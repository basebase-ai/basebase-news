'use client';

import { useState, useEffect } from 'react';
import { Source, User } from '@/types';
import { useAppState } from '@/lib/state/AppContext';
import LoadingSpinner from './LoadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronRight, faChevronDown, faSearch } from '@fortawesome/free-solid-svg-icons';

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

interface FriendSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: User | null;
}

export default function FriendSourcesModal({ isOpen, onClose, friend }: FriendSourcesModalProps) {
  const { currentUser, setCurrentUser, currentSources, setCurrentSources } = useAppState();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [sourceStories, setSourceStories] = useState<Record<string, SourceStory[]>>({});
  const [loadingStories, setLoadingStories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && friend) {
      fetchFriendSources();
    } else {
      // Reset state when modal closes
      setSources([]);
      setSearchTerm('');
      setExpandedSources(new Set());
      setSourceStories({});
      setLoadingStories(new Set());
      setError(null);
    }
  }, [isOpen, friend]);

  const fetchFriendSources = async () => {
    if (!friend) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/sources');
      if (response.ok) {
        const data = await response.json();
        const sourcesArray = Array.isArray(data) ? data : [];
        // Filter to only show sources that the friend follows
        const friendSources = sourcesArray.filter((source: Source) => 
          friend.sourceIds?.includes(source._id)
        );
        setSources(friendSources);
      } else {
        throw new Error(`Failed to fetch sources: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
             setError('Failed to load friend&apos;s sources');
    } finally {
      setLoading(false);
    }
  };

  const fetchSourceStories = async (sourceId: string) => {
    setLoadingStories(prev => new Set(prev).add(sourceId));
    try {
      const response = await fetch(`/api/sources/${sourceId}`);
      if (response.ok) {
        const data = await response.json();
        const stories = data.source?.stories?.slice(0, 3) || [];
        setSourceStories(prev => ({ ...prev, [sourceId]: stories }));
      }
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
      if (!sourceStories[sourceId]) {
        fetchSourceStories(sourceId);
      }
    }
    setExpandedSources(newExpanded);
  };

  const handleAddSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      const updatedSourceIds = currentUser.sourceIds.includes(sourceId)
        ? currentUser.sourceIds
        : [sourceId, ...currentUser.sourceIds];

      const response = await fetch('/api/users/me/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: updatedSourceIds }),
      });

      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
        
        const sourceResponse = await fetch(`/api/sources/${sourceId}`);
        if (sourceResponse.ok) {
          const { source } = await sourceResponse.json();
          if (source && !currentSources?.some(s => s._id === source._id)) {
            setCurrentSources(prev => [...(prev || []), source]);
          }
        }
      } else {
        throw new Error('Failed to update user sources');
      }
    } catch (error) {
      console.error('Failed to add source:', error);
    }
  };

  const handleRemoveSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      const updatedSourceIds = currentUser.sourceIds.filter(id => id !== sourceId);

      const response = await fetch('/api/users/me/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: updatedSourceIds }),
      });

      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
        setCurrentSources(prev => prev.filter(s => s._id !== sourceId));
      } else {
        throw new Error('Failed to update user sources');
      }
    } catch (error) {
      console.error('Failed to remove source:', error);
    }
  };

  const isSourceAdded = (sourceId: string): boolean => {
    return currentUser?.sourceIds.includes(sourceId) || false;
  };

  const filteredSources = sources.filter(source => 
    source.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    source.homepageUrl.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <FontAwesomeIcon icon={faTimes} className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {friend?.first} {friend?.last}&apos;s Sources
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View and add sources followed by {friend?.first}
            </p>
          </div>

          <div className="mb-6">
            <div className="relative">
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
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && <LoadingSpinner message="Loading sources..." />}
            {error && <div className="text-center py-4 text-red-500">{error}</div>}
            
            {!loading && !error && (
              <div className="space-y-2">
                {filteredSources.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {friend?.first} doesn&apos;t follow any sources yet.
                  </div>
                ) : (
                  filteredSources.map(source => (
                    <div key={source._id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleSourceExpansion(source._id)}
                            className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                          >
                            <FontAwesomeIcon 
                              icon={expandedSources.has(source._id) ? faChevronDown : faChevronRight} 
                              className="h-4 w-4" 
                            />
                          </button>
                          {source.imageUrl && <img src={source.imageUrl} alt={source.name} className="w-8 h-8 object-contain" />}
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{source.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{source.homepageUrl}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isSourceAdded(source._id) ? (
                            <button onClick={() => handleRemoveSource(source._id)} className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700">
                              Remove
                            </button>
                          ) : (
                            <button onClick={() => handleAddSource(source._id)} className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700">
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded stories section */}
                      {expandedSources.has(source._id) && (
                        <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-25 dark:bg-gray-800/30">
                          {loadingStories.has(source._id) ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                              Loading stories...
                            </div>
                          ) : sourceStories[source._id]?.length > 0 ? (
                            <div className="p-4 space-y-3">
                              {sourceStories[source._id].map(story => (
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
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 