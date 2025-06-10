'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Menu } from '@headlessui/react';
import TimeAgo from 'react-timeago';
import { Source, Story } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faStar, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';

interface SourceBoxProps {
  source: Source;
  headlines: Story[];
  isRefreshing: boolean;
  denseMode: boolean;
  onRefresh: (sourceId: string) => void;
  onRemove: (sourceId: string) => void;
  onMarkAsRead: (storyId: string) => void;
  onOpenSettings: (source: Source) => void;
  onToggleStar: (storyId: string) => void;
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
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  headlines, 
  isRefreshing, 
  denseMode,
  onRefresh, 
  onRemove, 
  onMarkAsRead,
  onOpenSettings,
  onToggleStar,
  searchTerm,
  dragHandleAttributes,
  dragHandleListeners
}: SourceBoxInternalProps) {
  const filteredHeadlines = filterHeadlines(headlines, searchTerm);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-[250px] flex flex-col">
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
                  onClick={() => onRefresh(source._id)}
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
        ) : filteredHeadlines.length === 0 ? (
          <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-sm">
            Loading stories...
          </div>
        ) : (
          <div className="space-y-0 pt-0.5">
            {filteredHeadlines.map(headline => (
              <article 
                key={headline.id} 
                className={`pl-3 pr-2 ${denseMode ? 'pt-1 pb-0' : 'py-2'} hover:bg-gray-50 dark:hover:bg-gray-700/50 group relative`}
              >
                <a
                  href={headline.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  onClick={(e) => {
                    if (!headline.id) {
                      console.error('[SourceBox] Story has no ID:', headline);
                      return;
                    }
                    console.log('[SourceBox] Story clicked:', {
                      id: headline.id,
                      currentStatus: headline.status,
                      headline: headline.fullHeadline
                    });
                    onMarkAsRead(headline.id);
                  }}
                >
                  <div 
                    className={`flex items-start justify-between gap-4 ${headline.status === 'READ' ? 'opacity-50' : ''}`}
                  >
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
                        <h3 className={`font-medium text-base text-gray-800 dark:text-gray-100`}>
                          {headline.fullHeadline}
                        </h3>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {headline.createdAt && (
                        <div className={`text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ${denseMode ? 'hidden group-hover:block' : 'block'}`}>
                          {formatDate(headline.createdAt)}
                        </div>
                      )}
                      {headline.status === 'READ' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (headline.id) {
                              onToggleStar(headline.id);
                            }
                          }}
                          className="text-gray-400 hover:text-yellow-400 dark:text-gray-500 dark:hover:text-yellow-400 transition-colors"
                        >
                          <FontAwesomeIcon 
                            icon={headline.starred ? faStar : faStarRegular} 
                            className={`w-4 h-4 ${headline.starred ? 'text-yellow-400' : ''}`}
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
  );
} 