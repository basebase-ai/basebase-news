'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import { Story, Source } from '@/types';
import SourceBox from './SourceBox';
import SourceSettings from './SourceSettings';
import { userService } from '@/services/user.service';
import StarredStories from './StarredStories';

interface SourceGridProps {
  friendsListOpen: boolean;
}

export default function SourceGrid({ friendsListOpen }: SourceGridProps) {
  const { currentUser, currentSources, searchTerm, setCurrentUser, denseMode, setSignInModalOpen } = useAppState();
  const [sourceHeadlines, setSourceHeadlines] = useState<Map<string, Story[]>>(new Map());
  const [loadingSources, setLoadingSources] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [refreshingSources, setRefreshingSources] = useState<Set<string>>(new Set());
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState<boolean>(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const initialLoadDone = useRef(false);
  const headlinesRef = useRef<Map<string, Story[]>>(new Map());
  const [showAllStarred, setShowAllStarred] = useState(false);

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
        setLoadingSources(new Set(currentUser.sourceIds));
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
          setLoadingSources(prev => {
            const newSet = new Set(prev);
            newSet.delete(sourceId);
            return newSet;
          });
        } catch (error) {
          console.error(`Error fetching stories for source ${sourceId}:`, error);
          setLoadingSources(prev => {
            const newSet = new Set(prev);
            newSet.delete(sourceId);
            return newSet;
          });
        }
      }
      
      setSourceHeadlines(newSourceHeadlines);
      initialLoadDone.current = true;
    } catch (error) {
      console.error('Error loading headlines:', error);
      setError('Failed to load headlines');
      setLoadingSources(new Set());
    }
  }, [currentUser?.sourceIds]);

  useEffect(() => {
    if (currentUser?.sourceIds?.length && currentSources?.length) {
      loadHeadlines();
    }
  }, [currentUser?.sourceIds, currentSources?.length, loadHeadlines]);

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

  const markAsRead = async (storyId: string) => {
    console.log('[SourceGrid.markAsRead] Starting to mark story as read:', storyId);
    try {
      if (!storyId) {
        console.error('[SourceGrid.markAsRead] No story ID provided');
        return;
      }

      const requestBody = JSON.stringify({ storyId });
      console.log('[SourceGrid.markAsRead] Request body:', requestBody);
      
      const response = await fetch('/api/users/me/readids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
        credentials: 'include'
      });

      const responseText = await response.text();
      console.log('[SourceGrid.markAsRead] API response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      if (response.ok) {
        console.log('[SourceGrid.markAsRead] Updating UI state for story:', storyId);
        const newMap = new Map(sourceHeadlines);
        newMap.forEach((stories, sourceId) => {
          const updatedStories = stories.map(story => {
            if (story.id === storyId) {
              console.log('[SourceGrid.markAsRead] Found story to update:', {
                id: story.id,
                oldStatus: story.status,
                newStatus: 'READ'
              });
              return { ...story, status: 'READ' as const };
            }
            return story;
          });
          newMap.set(sourceId, updatedStories);
        });
        console.log('[SourceGrid.markAsRead] Setting new headlines map');
        setSourceHeadlines(newMap);
      }
    } catch (error) {
      console.error('[SourceGrid.markAsRead] Failed to mark story as read:', error);
    }
  };

  const toggleStar = async (storyId: string) => {
    console.log('[SourceGrid.toggleStar] Starting to toggle star for story:', storyId);
    try {
      if (!storyId) {
        console.error('[SourceGrid.toggleStar] No story ID provided');
        return;
      }

      const response = await fetch('/api/users/me/stories/star', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyId }),
        credentials: 'include'
      });

      if (response.ok) {
        const newMap = new Map(sourceHeadlines);
        newMap.forEach((stories, sourceId) => {
          const updatedStories = stories.map(story => {
            if (story.id === storyId) {
              return { ...story, starred: !story.starred };
            }
            return story;
          });
          newMap.set(sourceId, updatedStories);
        });
        setSourceHeadlines(newMap);
      }
    } catch (error) {
      console.error('[SourceGrid.toggleStar] Failed to toggle star:', error);
    }
  };

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Please sign in to view stories</p>
        <button
          onClick={() => setSignInModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (showAllStarred) {
    return (
      <div className="space-y-6">
        <StarredStories />
        <div className="flex justify-end pt-2">
          <button
            className="px-4 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition"
            onClick={() => setShowAllStarred(false)}
          >
            Back to Sources
          </button>
        </div>
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
    <div className="space-y-6">
      <StarredStories limit={3} onViewAll={() => setShowAllStarred(true)} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentUser.sourceIds.map(sourceId => {
          const source = currentSources?.find(s => s._id === sourceId);
          const headlines = sourceHeadlines.get(sourceId) || [];
          const isRefreshing = refreshingSources.has(sourceId);
          const isLoading = loadingSources.has(sourceId);

          if (!source) return null;

          return (
            <SourceBox
              key={sourceId}
              source={source}
              headlines={headlines}
              isRefreshing={isRefreshing}
              denseMode={denseMode}
              onRefresh={handleRefreshSource}
              onRemove={handleRemoveSource}
              onMarkAsRead={markAsRead}
              onToggleStar={toggleStar}
              onOpenSettings={(source) => {
                setEditingSource(source);
                setSourceSettingsOpen(true);
              }}
              searchTerm={searchTerm}
            />
          );
        })}
      </div>
      <SourceSettings
        isOpen={sourceSettingsOpen}
        onClose={() => {
          setSourceSettingsOpen(false);
          setEditingSource(null);
        }}
        editingSource={editingSource}
      />
    </div>
  );
} 