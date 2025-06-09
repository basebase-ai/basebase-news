'use client';

import { Menu } from '@headlessui/react';
import TimeAgo from 'react-timeago';
import { Source, Story } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

interface SourceBoxProps {
  source: Source;
  headlines: Story[];
  isRefreshing: boolean;
  denseMode: boolean;
  onRefresh: (sourceId: string) => void;
  onRemove: (sourceId: string) => void;
  onMarkAsRead: (storyId: string) => void;
  onOpenSettings: (source: Source) => void;
  searchTerm?: string;
}

const filterHeadlines = (headlines: Story[], searchTerm?: string): Story[] => {
  if (!searchTerm) return headlines;
  const term = searchTerm.toLowerCase();
  return headlines.filter(headline =>
    (headline.fullHeadline?.toLowerCase() || '').includes(term) ||
    (headline.summary?.toLowerCase() || '').includes(term)
  );
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export default function SourceBox({ 
  source, 
  headlines, 
  isRefreshing, 
  denseMode,
  onRefresh, 
  onRemove, 
  onMarkAsRead,
  onOpenSettings,
  searchTerm 
}: SourceBoxProps) {
  const filteredHeadlines = filterHeadlines(headlines, searchTerm);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-[250px] flex flex-col">
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
          <Menu.Button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </Menu.Button>
          <Menu.Items className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 focus:outline-none z-10">
            <Menu.Item>
              {({ active }: { active: boolean }) => (
                <button
                  className={`${
                    active ? 'bg-gray-50 dark:bg-gray-700' : ''
                  } flex w-full items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200`}
                  onClick={() => onRefresh(source._id)}
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
                key={headline._id} 
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
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-sm ${denseMode ? 'truncate' : 'line-clamp-2'} ${
                      headline.status === 'READ' 
                        ? 'text-gray-400 dark:text-gray-500' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      <span className={!denseMode ? 'font-medium' : ''}>{headline.fullHeadline}</span>
                      {headline.summary && (
                        <span className={`${headline.status === 'READ' 
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {denseMode ? " - " : " — "}
                          {headline.summary}
                        </span>
                      )}
                    </div>
                    {headline.createdAt && (
                      <div className={`text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0 ${denseMode ? 'hidden group-hover:block' : 'block'}`}>
                        {formatDate(headline.createdAt)}
                      </div>
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
} 