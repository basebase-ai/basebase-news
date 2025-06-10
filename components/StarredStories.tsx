'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow, isValid } from 'date-fns';
import Avatar from './Avatar';
import type { User } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';

interface StarredStory {
  story: {
    id: string;
    fullHeadline: string;
    articleUrl: string;
    createdAt: string | Date;
    sourceId: string;
    sourceName: string;
  };
  user: Pick<User, '_id' | 'first' | 'last' | 'imageUrl' | 'email'>;
}

interface StarredStoriesProps {
  limit?: number;
  onViewAll?: () => void;
}

export default function StarredStories({ limit, onViewAll }: StarredStoriesProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starredStories, setStarredStories] = useState<StarredStory[]>([]);

  useEffect(() => {
    const fetchStarredStories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users/me/stories/starred');
        if (!response.ok) {
          throw new Error('Failed to fetch starred stories');
        }
        const data = await response.json();
        if (data.status === 'ok' && Array.isArray(data.starredStories)) {
          setStarredStories(data.starredStories);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStarredStories();
  }, []);

  const displayedStories = limit ? starredStories.slice(0, limit) : starredStories;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FontAwesomeIcon icon={faStar} className="text-yellow-400 w-4 h-4" />
            Starred by Friends
          </h2>
          <button
            className="px-4 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition"
            onClick={onViewAll}
          >
            View All
          </button>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500">
            Error loading starred stories: {error}
          </div>
        ) : displayedStories.length === 0 ? (
          <div className="text-gray-500">
            No starred stories from friends yet
          </div>
        ) : (
          <div className="space-y-4">
            {displayedStories.map(({ story, user }) => {
              const date = new Date(story.createdAt);
              const isValidDate = isValid(date);
              const timeAgo = isValidDate
                ? formatDistanceToNow(date, { addSuffix: true })
                : 'Unknown date';

              return (
                <div key={story.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Avatar user={user} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={story.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline truncate block"
                    >
                      {story.fullHeadline}
                    </a>
                    <div className="flex items-center space-x-1 text-xs text-gray-500 truncate">
                      <span className="truncate">{`${user.first} ${user.last}`}</span>
                      <span className="flex-shrink-0">•</span>
                      <a 
                        href={`/sources/${story.sourceId}`}
                        className="truncate hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {story.sourceName}
                      </a>
                      <span className="flex-shrink-0">•</span>
                      <span className="flex-shrink-0">{timeAgo}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 