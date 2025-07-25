'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Menu } from '@headlessui/react';
import TimeAgo from 'react-timeago';
import { Source, Story } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faGripVertical, faStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import PostComposer from './PostComposer';
import StoryReactionModal from './StoryReactionModal';
import { sourceService } from '@/services/source.service';
import { storyService } from '@/services/story.service';
import { useAppState } from '@/lib/state/AppContext';

interface SourceBoxProps {
  source: Source;
  denseMode: boolean;
  onRemove: (sourceId: string) => void;
  onOpenSettings: (source: Source) => void;
  onSourceUpdate?: (source: Source) => void;
  searchTerm?: string;
}

function filterHeadlines(headlines: Story[], searchTerm?: string): Story[] {
  if (!searchTerm) {
    return headlines;
  }
  const lowercasedTerm = searchTerm.toLowerCase();
  return headlines.filter(headline =>
    headline.fullHeadline?.toLowerCase().includes(lowercasedTerm)
  );
}

function formatDate(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo`;
  return `${Math.floor(diffInSeconds / 31536000)}y`;
}

export function SortableSourceBox(props: SourceBoxProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.source.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SourceBox {...props} dragHandleAttributes={attributes} dragHandleListeners={listeners} />
    </div>
  );
}

interface SourceBoxInternalProps extends SourceBoxProps {
  dragHandleAttributes?: React.HTMLAttributes<HTMLDivElement>;
  dragHandleListeners?: React.HTMLAttributes<HTMLDivElement>;
}

export default function SourceBox({ 
  source, 
  denseMode,
  onRemove, 
  onOpenSettings,
  onSourceUpdate,
  searchTerm,
  dragHandleAttributes,
  dragHandleListeners
}: SourceBoxInternalProps) {
  const { sourceHeadlines, setSourceHeadlines, currentUser } = useAppState();
  const [headlines, setHeadlines] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showPostComposer, setShowPostComposer] = useState<boolean>(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [hoveredStory, setHoveredStory] = useState<Story | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [showReactionModal, setShowReactionModal] = useState<boolean>(false);
  const [reactionStory, setReactionStory] = useState<Story | null>(null);
  const loadingRef = useRef<boolean>(false);

  const loadHeadlines = useCallback(async (forceRefresh: boolean = false) => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setIsLoading(!forceRefresh);
      
      // Use the new efficient method that handles caching and status fetching
      const storiesWithStatus = await storyService.getStoriesWithStatus(
        source.id,
        currentUser?.id,
        50
      );
      
      // Transform to UI format
      const transformedStories: Story[] = storiesWithStatus.map(story => ({
        id: story.id || '',
        articleUrl: story.url || '',
        fullHeadline: story.headline,
        sourceName: source.name,
        sourceUrl: source.homepageUrl,
        summary: story.summary,
        imageUrl: story.imageUrl,
        status: story.status || 'UNREAD',
        starred: story.starred || false,
        publishedAt: story.publishedAt || '',
      }));

      // Sort by published date (most recent first)
      const sortedStories = transformedStories.sort((a, b) => {
        const dateA = new Date(a.publishedAt || '1970-01-01');
        const dateB = new Date(b.publishedAt || '1970-01-01');
        
        // Handle invalid dates
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        
        return timeB - timeA;
      });

      setHeadlines(sortedStories);

    } catch (error) {
      console.error(`Error fetching stories for source ${source.id}:`, error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [source.id, source.name, source.homepageUrl, currentUser?.id]);

  const updateCache = useCallback((stories: Story[]) => {
    const newCache = new Map(sourceHeadlines);
    newCache.set(source.id, stories);
    setSourceHeadlines(newCache);
  }, [sourceHeadlines, setSourceHeadlines, source.id]);

  useEffect(() => {
    loadHeadlines();
  }, [loadHeadlines]);

  const handleRefreshSource = async () => {
    try {
      setIsRefreshing(true);
      
      // First trigger a fresh scrape of this source
      const response = await fetch('/api/admin/scrape-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceId: source.id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to scrape source');
      }
      
      const result = await response.json();
      console.log('Source scraped successfully:', result);
      
      // Update the source's lastScrapedAt if we have an onSourceUpdate callback
      if (onSourceUpdate) {
        onSourceUpdate({
          ...source,
          lastScrapedAt: result.lastScrapedAt
        });
      }
      
      // Then load the fresh headlines from the database
      await loadHeadlines(true);
      
    } catch (error) {
      console.error('Failed to refresh source:', error);
      // Still try to reload existing headlines even if scraping failed
      await loadHeadlines(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const markAsRead = useCallback(async (storyId: string) => {
    if (!currentUser) {
      console.log('No user logged in, cannot mark story as read');
      return;
    }

    try {
      // Call the actual service method to save to Basebase
      const success = await storyService.markStoryAsRead(currentUser.id, storyId);
      
      if (success) {
        console.log('Story marked as read:', storyId);
        
        // Update local state
        setHeadlines(prevHeadlines => 
          prevHeadlines.map(story => {
            if (story.id === storyId) {
              return { ...story, status: 'READ' as const };
            }
            return story;
          })
        );

        // Update cache directly
        const newCache = new Map(sourceHeadlines);
        const cachedStories = newCache.get(source.id);
        if (cachedStories) {
          const updatedStories = cachedStories.map(story => {
            if (story.id === storyId) {
              return { ...story, status: 'READ' as const };
            }
            return story;
          });
          newCache.set(source.id, updatedStories);
          setSourceHeadlines(newCache);
        }
      }
    } catch (error) {
      console.error('Error marking story as read:', error);
    }
  }, [currentUser?.id, source.id, updateCache]);

  const handleStar = useCallback(async (e: React.MouseEvent, story: Story) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      console.log('No user logged in, cannot star story');
      return;
    }

    try {
      const newStarredState = !story.starred;
      const success = await storyService.toggleStoryStarred(currentUser.id, story.id, newStarredState);
      
      if (success) {
        console.log('Story starred:', story.id, newStarredState);
        
        // Update local state
        setHeadlines(prevHeadlines => 
          prevHeadlines.map(s => {
            if (s.id === story.id) {
              return { ...s, starred: newStarredState };
            }
            return s;
          })
        );

        // Update cache directly
        const newCache = new Map(sourceHeadlines);
        const cachedStories = newCache.get(source.id);
        if (cachedStories) {
          const updatedStories = cachedStories.map(s => {
            if (s.id === story.id) {
              return { ...s, starred: newStarredState };
            }
            return s;
          });
          newCache.set(source.id, updatedStories);
          setSourceHeadlines(newCache);
        }
      }
    } catch (error) {
      console.error('Error starring story:', error);
    }
  }, [currentUser?.id, source.id, updateCache]);

  const handleShare = useCallback(async (e: React.MouseEvent, story: Story) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedStory(story);
    setShowPostComposer(true);
  }, []);

  const handleClosePostComposer = useCallback(() => {
    setShowPostComposer(false);
    setSelectedStory(null);
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent, story: Story) => {
    // Clear any existing timer to prevent multiple tooltips
    setHoverTimer(prevTimer => {
      if (prevTimer) {
        clearTimeout(prevTimer);
      }
      return null;
    });
    
    setHoveredStory(story);
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY
    });

    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 500);

    setHoverTimer(timer);
  }, []); // Remove hoverTimer dependency

  const handleMouseLeave = useCallback(() => {
    setHoverTimer(prevTimer => {
      if (prevTimer) {
        clearTimeout(prevTimer);
      }
      return null;
    });
    setShowTooltip(false);
    setHoveredStory(null);
  }, []); // Remove hoverTimer dependency

  const handleStoryClick = useCallback(async (story: Story) => {
    // Mark as read
    await markAsRead(story.id);
    
    // Open in new tab
    window.open(story.articleUrl, '_blank');
  }, [markAsRead]);

  const handleRecommend = useCallback(async (comment?: string) => {
    // TODO: Implement recommendations in BaseBase
    console.log('Story recommended:', selectedStory?.id, comment);
    handleClosePostComposer();
  }, [selectedStory?.id, handleClosePostComposer]);

  const filteredHeadlines = useMemo(() => filterHeadlines(headlines, searchTerm), [headlines, searchTerm]);

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${denseMode ? 'h-[250px]' : 'h-[400px]'} flex flex-col`}>
        <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div {...dragHandleAttributes} {...dragHandleListeners} className="cursor-grab active:cursor-grabbing p-2 shrink-0">
              <FontAwesomeIcon 
                icon={faGripVertical} 
                className="w-4 h-4 text-gray-400 dark:text-gray-500"
              />
            </div>
            {source.imageUrl ? (
              <img 
                src={source.imageUrl} 
                alt={source.name} 
                className="w-6 h-6 object-contain shrink-0"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                  {source.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <a 
                href={source.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-gray-900 dark:text-white text-sm truncate hover:text-primary dark:hover:text-primary"
              >
                {source.name}
              </a>
              {source.lastScrapedAt && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Updated <TimeAgo date={source.lastScrapedAt} />
                </div>
              )}
            </div>
          </div>
          <Menu as="div" className="relative shrink-0">
            <Menu.Button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={faEllipsisV} className="w-4 h-4" />
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700 focus:outline-none">
              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    className={`${
                      active ? 'bg-gray-50 dark:bg-gray-700' : ''
                    } flex w-full items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200`}
                    onClick={handleRefreshSource}
                  >
                    Refresh
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                  {({ active }: { active: boolean }) => (
                    <button
                      className={`${
                        active ? 'bg-gray-50 dark:bg-gray-700' : ''
                      } flex w-full items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200`}
                      onClick={() => onOpenSettings(source)}
                    >
                      Settings
                    </button>
                  )}
                </Menu.Item>
              {source.rssUrl && (
                <Menu.Item>
                  {({ active }: { active: boolean }) => (
                    <a
                      href={source.rssUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${
                        active ? 'bg-gray-50 dark:bg-gray-700' : ''
                      } flex w-full items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200`}
                    >
                      View Feed
                    </a>
                  )}
                </Menu.Item>
              )}
              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    className={`${
                      active ? 'bg-gray-50 dark:bg-gray-700' : ''
                    } flex w-full items-center px-3 py-2 text-sm text-red-600 dark:text-red-400`}
                    onClick={() => onRemove(source.id)}
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
          ) : isLoading ? (
            <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-sm">
              Loading stories...
            </div>
          ) : filteredHeadlines.length === 0 ? (
            <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-sm">
              No stories found
            </div>
          ) : (
            <div className="space-y-0 pt-0.5">
              {filteredHeadlines.map(headline => (
                <article 
                  key={headline.id} 
                  className={`pl-3 pr-2 ${denseMode ? 'pt-1 pb-0' : 'py-2'} hover:bg-gray-50 dark:hover:bg-gray-700/50 group relative ${
                    headline.status === 'READ' ? 'opacity-60' : ''
                  }`}
                  onMouseEnter={(e) => handleMouseEnter(e, headline)}
                  onMouseLeave={handleMouseLeave}
                >
                  <a
                    href={headline.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      handleStoryClick(headline);
                    }}
                                          className={`block group-hover:text-primary ${
                        headline.status === 'READ' ? 'text-gray-500 dark:text-gray-400' : ''
                      }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      {/* Story image - only show if available and not in dense mode */}
                      {!denseMode && headline.imageUrl && (
                        <img 
                          src={headline.imageUrl} 
                          alt=""
                          className="w-16 h-16 object-cover rounded shrink-0"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-medium ${denseMode ? 'leading-snug' : 'leading-normal'} line-clamp-2 mb-1 ${
                          headline.status === 'READ' 
                            ? 'text-gray-500 dark:text-gray-400' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {headline.fullHeadline}
                        </h3>
                        {!denseMode && headline.summary && (
                          <p className={`text-xs line-clamp-2 mb-1 ${
                            headline.status === 'READ'
                              ? 'text-gray-400 dark:text-gray-500'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}>
                            {headline.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {headline.publishedAt && (
                          <div className={`text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ${denseMode ? 'hidden group-hover:block' : 'block'}`}>
                            {formatDate(headline.publishedAt)}
                          </div>
                        )}
                        <button
                          onClick={(e) => handleStar(e, headline)}
                          className={`text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-500 transition-colors ${
                            headline.starred ? 'text-yellow-500' : ''
                          }`}
                        >
                          <FontAwesomeIcon 
                            icon={headline.starred ? faStar : faStarRegular} 
                            className={headline.starred ? "text-yellow-500" : ""}
                          />
                        </button>
                      </div>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPostComposer && selectedStory && (
        <PostComposer
          story={selectedStory}
          onClose={handleClosePostComposer}
        />
      )}

      {showTooltip && hoveredStory && (
        <div
          className="fixed bg-black text-white text-sm rounded-lg p-3 shadow-lg z-50 max-w-sm"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold mb-1">{hoveredStory.fullHeadline}</div>
          {hoveredStory.summary && (
            <div className="text-gray-300 text-xs">
              {hoveredStory.summary.length > 150 
                ? hoveredStory.summary.substring(0, 150) + '...'
                : hoveredStory.summary
              }
            </div>
          )}
        </div>
      )}

      {showReactionModal && reactionStory && (
        <StoryReactionModal
          story={reactionStory}
          onClose={() => {
            setShowReactionModal(false);
            setReactionStory(null);
          }}
          onRecommend={handleRecommend}
        />
      )}
    </>
  );
} 