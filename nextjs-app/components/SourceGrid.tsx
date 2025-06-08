'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import { Story, Source } from '@/types';

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
  const { currentUser, currentSources, denseMode } = useAppState();
  const [sourceHeadlines, setSourceHeadlines] = useState<Map<string, Story[]>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Update the local state to mark the story as read
        setSourceHeadlines(prev => {
          const newMap = new Map(prev);
          newMap.forEach((stories, sourceId) => {
            const updatedStories = stories.map(story => 
              story._id === storyId 
                ? { ...story, status: 'READ' as const }
                : story
            );
            newMap.set(sourceId, updatedStories);
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error('Failed to mark story as read:', error);
    }
  };

  const loadHeadlines = useCallback(async () => {
    if (!currentUser?.sourceIds?.length || !currentSources?.length) {
      console.log('No sourceIds or sources available, skipping headlines fetch');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const newSourceHeadlines = new Map<string, Story[]>();
      
      // Fetch stories from each source
      for (const sourceId of currentUser.sourceIds) {
        try {
          const response = await fetch(`/api/sources/${sourceId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.source?.stories) {
              // Sort stories by date
              const sortedStories = [...data.source.stories].sort((a, b) => {
                const dateA = new Date(a.publishDate);
                const dateB = new Date(b.publishDate);
                return isNaN(dateB.getTime()) || isNaN(dateA.getTime()) 
                  ? 0 
                  : dateB.getTime() - dateA.getTime();
              });
              newSourceHeadlines.set(sourceId, sortedStories);
            }
          }
        } catch (error) {
          console.error(`Failed to fetch stories for source ${sourceId}:`, error);
        }
      }
      
      setSourceHeadlines(newSourceHeadlines);
    } catch (error) {
      console.error('Failed to fetch headlines:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch headlines');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.sourceIds, currentSources]);

  useEffect(() => {
    loadHeadlines();
  }, [loadHeadlines]);

  const getSourceById = (sourceId: string): Source | undefined => {
    return currentSources?.find(source => source._id === sourceId);
  };

  const filterHeadlines = (headlines: Story[]): Story[] => {
    if (!searchTerm) return headlines;
    const term = searchTerm.toLowerCase();
    return headlines.filter(headline =>
      (headline.fullHeadline?.toLowerCase() || '').includes(term) ||
      (headline.sourceName?.toLowerCase() || '').includes(term)
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

        if (!source) return null;

        return (
          <div key={sourceId} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-[250px] flex flex-col">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center space-x-3 shrink-0">
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
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredHeadlines.length === 0 ? (
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