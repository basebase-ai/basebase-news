'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import { Story, Source } from '@/types';
import { Menu } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

const formatDate = (dateStr: string): string => {
  try {
    // Try parsing as ISO string first
    let date = new Date(dateStr);
    
    // If still invalid, return empty string
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateStr}`);
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export default function SourceGrid() {
  const { currentUser, currentSources, denseMode, searchTerm, setCurrentUser } = useAppState();
  const [sourceHeadlines, setSourceHeadlines] = useState<Map<string, Story[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshingSources, setRefreshingSources] = useState<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const headlinesRef = useRef<Map<string, Story[]>>(new Map());

  // Keep the ref in sync with state, but only when headlines actually change
  useEffect(() => {
    if (sourceHeadlines.size !== headlinesRef.current.size || 
        Array.from(sourceHeadlines.keys()).some(key => 
          !headlinesRef.current.has(key) || 
          sourceHeadlines.get(key) !== headlinesRef.current.get(key))) {
      headlinesRef.current = sourceHeadlines;
    }
  }, [sourceHeadlines]);

  const loadHeadlines = useCallback(async () => {
    if (!currentUser?.sourceIds?.length) return;
    
    try {
      if (!initialLoadDone.current) {
        setLoading(true);
      }
      setError(null);
      
      const newSourceHeadlines = new Map<string, Story[]>();
      
      for (const sourceId of currentUser.sourceIds) {
        try {
          const response = await fetch(`/api/sources/${sourceId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.source?.stories) {
              const stories = data.source.stories as Story[];
              const sortedStories = [...stories].sort((a: Story, b: Story) => {
                const dateA = new Date(a.publishDate);
                const dateB = new Date(b.publishDate);
                return dateB.getTime() - dateA.getTime();
              });
              newSourceHeadlines.set(sourceId, sortedStories);
            }
          }
        } catch (error) {
          console.error(`Error fetching stories for source ${sourceId}:`, error);
        }
      }
      
      setSourceHeadlines(newSourceHeadlines);
      initialLoadDone.current = true;
    } catch (error) {
      console.error('Error loading headlines:', error);
      setError('Failed to load headlines');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.sourceIds]);

  useEffect(() => {
    if (currentUser?.sourceIds?.length && currentSources?.length && !initialLoadDone.current) {
      loadHeadlines();
    }
  }, [currentUser?.sourceIds, currentSources?.length, loadHeadlines]);

  const getSourceById = (sourceId: string): Source | undefined => {
    return currentSources?.find(source => source._id === sourceId);
  };

  const markAsRead = async (storyId: string) => {
    try {
      const response = await fetch('/api/users/me/readids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyId }),
      });

      if (response.ok) {
        const newMap = new Map(sourceHeadlines);
        newMap.forEach((stories, sourceId) => {
          const updatedStories = stories.map(story => 
            story._id === storyId 
              ? { ...story, status: 'READ' as const }
              : story
          );
          newMap.set(sourceId, updatedStories);
        });
        setSourceHeadlines(newMap);
      }
    } catch (error) {
      console.error('Failed to mark story as read:', error);
    }
  };

  const handleRefreshSource = async (sourceId: string) => {
    try {
      setRefreshingSources(prev => new Set(Array.from(prev).concat(sourceId)));
      const newMap = new Map(sourceHeadlines);
      newMap.set(sourceId, []);
      setSourceHeadlines(newMap);

      const response = await fetch(`/api/sources/${sourceId}/scrape`, {
        method: 'POST',
      });

      if (response.ok) {
        // Reload the headlines for this source
        loadHeadlines();
      } else {
        throw new Error('Failed to refresh source');
      }
    } catch (error) {
      console.error('Failed to refresh source:', error);
    } finally {
      setRefreshingSources(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const handleRemoveSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      const updatedSourceIds = currentUser.sourceIds.filter(id => id !== sourceId);
      const response = await fetch('/api/users/me/sources', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceIds: updatedSourceIds,
        }),
      });

      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
        const newMap = new Map(sourceHeadlines);
        newMap.delete(sourceId);
        setSourceHeadlines(newMap);
      } else {
        throw new Error('Failed to update user sources');
      }
    } catch (error) {
      console.error('Failed to remove source:', error);
    }
  };

  const filterHeadlines = (headlines: Story[]): Story[] => {
    if (!searchTerm) return headlines;
    const term = searchTerm.toLowerCase();
    return headlines.filter(headline =>
      (headline.fullHeadline?.toLowerCase() || '').includes(term) ||
      (headline.summary?.toLowerCase() || '').includes(term)
    );
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-600 dark:text-gray-400">
        Loading headlines...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!currentUser?.sourceIds?.length) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Please select some news sources to follow.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {currentUser.sourceIds.map(sourceId => {
        const source = getSourceById(sourceId);
        const headlines = sourceHeadlines.get(sourceId) || [];
        const filteredHeadlines = filterHeadlines(headlines);
        const isRefreshing = refreshingSources.has(sourceId);

        if (!source) return null;

        return (
          <div key={sourceId} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-[250px] flex flex-col">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                {source.imageUrl ? (
                  <img 
                    src={source.imageUrl} 
                    alt={source.name} 
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                      {source.name.charAt(0)}
                    </span>
                  </div>
                )}
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                  {source.name}
                </h2>
              </div>
              
              <Menu as="div" className="relative">
                <Menu.Button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                  <EllipsisVerticalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 focus:outline-none z-10">
                  <Menu.Item>
                    {({ active }: { active: boolean }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-50 dark:bg-gray-700' : ''
                        } flex w-full items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200`}
                        onClick={() => handleRefreshSource(sourceId)}
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }: { active: boolean }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-50 dark:bg-gray-700' : ''
                        } flex w-full items-center px-3 py-2 text-sm text-red-600 dark:text-red-400`}
                        onClick={() => handleRemoveSource(sourceId)}
                      >
                        Remove
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isRefreshing ? (
                <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Refreshing...
                </div>
              ) : filteredHeadlines.length === 0 ? (
                <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No headlines found
                </div>
              ) : (
                <div className="space-y-0.5 pt-1">
                  {filteredHeadlines.map(headline => (
                    <article 
                      key={headline._id} 
                      className="pl-3 pr-2 pt-1.5 pb-0.5 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <a
                        href={headline.articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                        onClick={(e) => {
                          // Don't prevent default - let the link open
                          markAsRead(headline._id);
                        }}
                      >
                        <div className={`text-sm truncate ${
                          headline.status === 'READ' 
                            ? 'text-gray-400 dark:text-gray-500' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {headline.fullHeadline}
                          {headline.summary && (
                            <span className={headline.status === 'READ' 
                              ? 'text-gray-400 dark:text-gray-500'
                              : 'text-gray-500 dark:text-gray-400'
                            }>
                              {" - "}
                              {headline.summary}
                            </span>
                          )}
                        </div>
                      </a>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 