'use client';

import React, { useEffect, useState, useCallback } from 'react';
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

interface SourceBoxProps {
  source: Source;
  denseMode: boolean;
  onRemove: (sourceId: string) => void;
  onOpenSettings: (source: Source) => void;
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
  } = useSortable({ id: props.source._id });

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
  searchTerm,
  dragHandleAttributes,
  dragHandleListeners
}: SourceBoxInternalProps) {
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

  const loadHeadlines = useCallback(async () => {
    try {
      const response = await fetch(`/api/sources/${source._id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.source?.stories) {
          const stories = data.source.stories as Story[];
          const sortedStories = [...stories].sort((a: Story, b: Story) => {
            const dateA = new Date(a.createdAt || '');
            const dateB = new Date(b.createdAt || '');
            return dateB.getTime() - dateA.getTime();
          });
          setHeadlines(sortedStories);
        }
      }
    } catch (error) {
      console.error(`Error fetching stories for source ${source._id}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [source._id]);

  useEffect(() => {
    loadHeadlines();
  }, [loadHeadlines]);

  const handleRefreshSource = async () => {
    try {
      setIsRefreshing(true);
      setHeadlines([]);

      const response = await fetch(`/api/sources/${source._id}/scrape`, {
        method: 'POST',
      });

      if (response.ok) {
        // Reload the headlines for this source
        await loadHeadlines();
      } else {
        throw new Error('Failed to refresh source');
      }
    } catch (error) {
      console.error('Failed to refresh source:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const markAsRead = async (storyId: string) => {
    console.log('[SourceBox.markAsRead] Starting to mark story as read:', storyId);
    try {
      if (!storyId) {
        console.error('[SourceBox.markAsRead] No story ID provided');
        return;
      }

      const requestBody = JSON.stringify({ storyId });
      console.log('[SourceBox.markAsRead] Request body:', requestBody);
      
      const response = await fetch('/api/users/me/readids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
        credentials: 'include'
      });

      const responseText = await response.text();
      console.log('[SourceBox.markAsRead] API response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      if (response.ok) {
        console.log('[SourceBox.markAsRead] Updating UI state for story:', storyId);
        const updatedHeadlines = headlines.map(story => {
          if (story.id === storyId) {
            console.log('[SourceBox.markAsRead] Found story to update:', {
              id: story.id,
              oldStatus: story.status,
              newStatus: 'READ'
            });
            return { ...story, status: 'READ' as const };
          }
          return story;
        });
        console.log('[SourceBox.markAsRead] Setting new headlines');
        setHeadlines(updatedHeadlines);
      }
    } catch (error) {
      console.error('[SourceBox.markAsRead] Failed to mark story as read:', error);
    }
  };

  const handleStar = async (e: React.MouseEvent, story: Story) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(`/api/stories/${story.id}/star`, {
        method: story.starred ? 'DELETE' : 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        setHeadlines(headlines.map(h => 
          h.id === story.id ? { ...h, starred: !h.starred } : h
        ));
      }
    } catch (error) {
      console.error('Failed to star story:', error);
    }
  };

  const handleShare = async (e: React.MouseEvent, story: Story) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle starred status
    try {
      const response = await fetch('/api/users/me/stories/star', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyId: story.id }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setHeadlines(headlines.map(h => 
          h.id === story.id ? { ...h, starred: data.starred } : h
        ));
      }
    } catch (error) {
      console.error('Failed to star story:', error);
    }
    
    // Open share modal
    setSelectedStory(story);
    setShowPostComposer(true);
  };

  const handleClosePostComposer = () => {
    setShowPostComposer(false);
    setSelectedStory(null);
  };

  const handleMouseEnter = (e: React.MouseEvent, story: Story) => {
    // Don't show tooltips on mobile devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setHoveredStory(story);
    
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 1000);
    setHoverTimer(timer);
  };

  const handleMouseLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    setShowTooltip(false);
    setHoveredStory(null);
  };

  const handleStoryClick = async (story: Story) => {
    setReactionStory(story);
    window.open(story.articleUrl, '_blank');
    
    // Mark as read
    try {
      const response = await fetch('/api/users/me/readids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyId: story.id }),
        credentials: 'include'
      });
      
      if (response.ok) {
        setHeadlines(headlines.map(h => 
          h.id === story.id ? { ...h, status: 'READ' as const } : h
        ));
      }
    } catch (error) {
      console.error('Failed to mark story as read:', error);
    }
    
    // Show reaction modal when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setShowReactionModal(true);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  const handleRecommend = async (comment?: string) => {
    if (!reactionStory) return;
    
    try {
      const response = await fetch('/api/users/me/stories/star', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          storyId: reactionStory.id,
          comment 
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setHeadlines(headlines.map(h => 
          h.id === reactionStory.id ? { ...h, starred: data.starred } : h
        ));
      }
    } catch (error) {
      console.error('Failed to recommend story:', error);
    } finally {
      setShowReactionModal(false);
      setReactionStory(null);
    }
  };

  const filteredHeadlines = filterHeadlines(headlines, searchTerm);

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${denseMode ? 'h-[250px]' : 'h-[400px]'} flex flex-col`}>
        <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div {...dragHandleAttributes} {...dragHandleListeners} className="cursor-grab active:cursor-grabbing p-2">
              <FontAwesomeIcon 
                icon={faGripVertical} 
                className="w-4 h-4 text-gray-400 dark:text-gray-500"
              />
            </div>
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
            <div className="flex flex-col min-w-0">
              <a 
                href={source.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-gray-900 dark:text-white text-sm truncate hover:text-primary dark:hover:text-primary"
              >
                {source.name}
              </a>
              {source.lastScrapedAt && (
                <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Updated <TimeAgo date={source.lastScrapedAt} />
                </div>
              )}
            </div>
          </div>
          <Menu as="div" className="relative">
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
                    onClick={() => onRemove(source._id)}
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
                  className={`pl-3 pr-2 ${denseMode ? 'pt-1 pb-0' : 'py-2'} hover:bg-gray-50 dark:hover:bg-gray-700/50 group relative`}
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
                    className="block group-hover:text-primary"
                  >
                    <div 
                      className={`flex items-start justify-between gap-4 ${headline.status === 'READ' ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {!denseMode && headline.imageUrl && (
                          <img 
                            src={headline.imageUrl} 
                            alt=""
                            className="w-16 h-16 object-cover rounded shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {denseMode ? (
                            <p className="text-sm text-gray-800 dark:text-gray-100 truncate">
                              <span className="font-medium">{headline.fullHeadline}</span>
                              {headline.summary && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {' - '}{headline.summary}
                                </span>
                              )}
                            </p>
                          ) : (
                            <>
                              <h3 className={`font-medium text-base text-gray-800 dark:text-gray-100 leading-tight mb-1`}>
                                {headline.fullHeadline}
                              </h3>
                              {headline.summary && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {headline.summary}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {headline.createdAt && (
                          <div className={`text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ${denseMode ? 'hidden group-hover:block' : 'block'}`}>
                            {formatDate(headline.createdAt)}
                          </div>
                        )}
                        {headline.status === 'READ' && (
                          <button
                            onClick={(e) => handleShare(e, headline)}
                            className="text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-500 transition-colors"
                          >
                            <FontAwesomeIcon 
                              icon={headline.starred ? faStar : faStarRegular} 
                              className={headline.starred ? "text-yellow-500" : ""}
                            />
                          </button>
                        )}
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
            top: `${tooltipPosition.y}px`,
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